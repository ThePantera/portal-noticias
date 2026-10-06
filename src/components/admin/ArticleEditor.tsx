"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { canTransition, unpublishLabel } from "@/lib/article-transitions";
import { EMPTY_DOC, type EditorDoc } from "@/lib/content";
import { formatDateTime, toDateTimeInputValue } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import type { CategoryOption, EditableArticle, EditorFormState } from "@/types/admin";
import type { ArticleStatus } from "@/types/article";
import { RichTextEditor } from "./RichTextEditor";
import { StatusBadge } from "./StatusBadge";

type Props = {
  article: EditableArticle | null;
  categories: CategoryOption[];
  saveAction: (state: EditorFormState, formData: FormData) => Promise<EditorFormState>;
  deleteAction: (formData: FormData) => Promise<void>;
  /** Aviso que llega en la URL después de crear una nota o de un error al eliminar. */
  notice?: string;
  maxFeaturedRank: number;
};

const frame = "w-full rounded-md border border-rule bg-surface px-3 py-2 text-ink aria-invalid:border-danger";
const field = `${frame} text-base`;
const label = "text-sm font-semibold text-ink";
const hint = "text-sm text-ink-subtle";

/** Formulario completo de una nota: contenido a la izquierda, publicación y metadatos a la derecha. */
export function ArticleEditor({
  article,
  categories,
  saveAction,
  deleteAction,
  notice,
  maxFeaturedRank,
}: Props) {
  const [state, formAction, pending] = useActionState(saveAction, { status: "idle" });
  const errors = state.fieldErrors ?? {};
  const status: ArticleStatus = article?.status ?? "DRAFT";

  const [content, setContent] = useState<EditorDoc>(article?.content ?? EMPTY_DOC);
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [seoTitle, setSeoTitle] = useState(article?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(article?.seoDescription ?? "");
  // Todos los campos son controlados: React reinicia los no controlados después de cada
  // envío, y un error de validación no debe borrar lo que se escribió.
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? "");
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "");
  const [featuredRank, setFeaturedRank] = useState(String(article?.featuredRank ?? ""));
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Después de guardar bien ya no hay cambios pendientes. Se ajusta durante el render,
  // como recomienda React para estado que depende de otro valor.
  const [seenSavedAt, setSeenSavedAt] = useState(state.savedAt);
  if (state.savedAt !== seenSavedAt) {
    setSeenSavedAt(state.savedAt);
    setDirty(false);
  }

  // Avisa antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const message = state.message ?? notice;
  const isError =
    state.status === "error" || (!state.message && Boolean(notice) && !/^Nota creada/.test(notice ?? ""));

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={() => setDirty(true)}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      <input type="hidden" name="content" value={JSON.stringify(content)} />

      <div className="grid min-w-0 content-start gap-6">
        {message ? (
          <p
            role={isError ? "alert" : "status"}
            data-testid="editor-message"
            className={`rounded-md border px-4 py-3 text-sm ${isError ? "border-danger text-danger" : "border-success text-success"}`}
          >
            {message}
          </p>
        ) : null}

        <Field id="title" label="Título" error={errors.title}>
          {(props) => (
            <textarea
              {...props}
              name="title"
              rows={3}
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              placeholder="Escribí el título"
              className={`${frame} [field-sizing:content] resize-none font-display text-2xl leading-tight font-semibold sm:text-3xl`}
            />
          )}
        </Field>

        <Field
          id="excerpt"
          label="Bajada"
          error={errors.excerpt}
          hint="Una o dos oraciones que amplían el título. Aparece debajo en la nota y en la portada."
        >
          {(props) => (
            <textarea
              {...props}
              name="excerpt"
              rows={3}
              maxLength={400}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className={`${frame} [field-sizing:content] min-h-24 font-body text-md text-ink-muted`}
            />
          )}
        </Field>

        <div className="grid gap-1.5">
          <span id="content-label" className={label}>
            Cuerpo
          </span>
          <RichTextEditor
            initialContent={article?.content ?? EMPTY_DOC}
            onChange={(doc) => {
              setContent(doc);
              setDirty(true);
            }}
            invalid={Boolean(errors.content)}
            describedBy={errors.content ? "content-error" : undefined}
          />
          {errors.content ? (
            <p id="content-error" className="text-sm text-danger">
              {errors.content}
            </p>
          ) : null}
        </div>
      </div>

      <aside className="grid content-start gap-6 lg:sticky lg:top-6">
        <section
          aria-labelledby="publicacion"
          className="grid gap-4 rounded-md border border-rule bg-surface p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="publicacion" className="text-sm font-semibold tracking-wide uppercase">
              Publicación
            </h2>
            <span data-testid="editor-status">
              <StatusBadge status={status} />
            </span>
          </div>
          <PublicationSummary article={article} />
          <PublishControls
            status={status}
            pending={pending}
            dirty={dirty}
            scheduledAt={article?.scheduledAt ?? null}
            scheduleError={errors.scheduledAt}
          />
          {article ? (
            <Link
              href={`/admin/notas/${article.id}/vista-previa`}
              target="_blank"
              className="text-sm text-accent underline underline-offset-2"
            >
              Ver vista previa{dirty ? " (de lo último guardado)" : ""}
            </Link>
          ) : null}
        </section>

        <section aria-labelledby="clasificacion" className="grid gap-4">
          <h2 id="clasificacion" className="sr-only">
            Clasificación
          </h2>
          <Field id="categoryId" label="Categoría" error={errors.categoryId}>
            {(props) => (
              <select
                {...props}
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
              >
                <option value="" disabled>
                  Elegí una categoría
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isActive ? "" : " (oculta)"}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="tags" label="Etiquetas" error={errors.tags} hint="Separadas por coma. Hasta 10.">
            {(props) => (
              <input
                {...props}
                name="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Inflación, Salarios"
                className={field}
              />
            )}
          </Field>
          <Field id="featuredRank" label="Destacar en la portada" error={errors.featuredRank}>
            {(props) => (
              <select
                {...props}
                name="featuredRank"
                value={featuredRank}
                onChange={(e) => setFeaturedRank(e.target.value)}
                className={field}
              >
                <option value="">No destacar</option>
                <option value="1">Nota principal</option>
                {Array.from({ length: maxFeaturedRank - 1 }, (_, i) => i + 2).map((rank) => (
                  <option key={rank} value={rank}>
                    Destacada {rank}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </section>

        <details
          className="group rounded-md border border-rule bg-surface p-4"
          open={Boolean(errors.slug || errors.seoTitle || errors.seoDescription)}
        >
          <summary className="cursor-pointer text-sm font-semibold tracking-wide uppercase">
            Dirección y buscadores
          </summary>
          <div className="mt-4 grid gap-4">
            <Field
              id="slug"
              label="Dirección"
              error={errors.slug}
              hint={`/noticias/${slugify(slug || title) || "…"}`}
            >
              {(props) => (
                <input
                  {...props}
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={slugify(title) || "se-genera-desde-el-titulo"}
                  className={`${field} font-mono text-sm`}
                />
              )}
            </Field>
            <Field
              id="seoTitle"
              label="Título para buscadores"
              error={errors.seoTitle}
              hint={<Counter value={seoTitle} max={70} fallback="Vacío: se usa el título." />}
            >
              {(props) => (
                <input
                  {...props}
                  name="seoTitle"
                  maxLength={70}
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className={field}
                />
              )}
            </Field>
            <Field
              id="seoDescription"
              label="Descripción para buscadores"
              error={errors.seoDescription}
              hint={<Counter value={seoDescription} max={160} fallback="Vacía: se usa la bajada." />}
            >
              {(props) => (
                <textarea
                  {...props}
                  name="seoDescription"
                  rows={3}
                  maxLength={160}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className={field}
                />
              )}
            </Field>
          </div>
        </details>
      </aside>

      {article ? <DeleteArticle article={article} deleteAction={deleteAction} /> : null}
    </form>
  );
}

function PublicationSummary({ article }: { article: EditableArticle | null }) {
  if (!article) return <p className={hint}>Se guarda como borrador hasta que la publiques.</p>;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {article.status === "SCHEDULED" && article.scheduledAt ? (
        <>
          <dt className="text-ink-subtle">Sale el</dt>
          <dd>{formatDateTime(article.scheduledAt)}</dd>
        </>
      ) : null}
      {article.publishedAt ? (
        <>
          <dt className="text-ink-subtle">Publicada</dt>
          <dd>{formatDateTime(article.publishedAt)}</dd>
        </>
      ) : null}
      <dt className="text-ink-subtle">Guardada</dt>
      <dd>{formatDateTime(article.updatedAt)}</dd>
      <dt className="text-ink-subtle">Firma</dt>
      <dd>{article.authorName}</dd>
    </dl>
  );
}

function PublishControls({
  status,
  pending,
  dirty,
  scheduledAt,
  scheduleError,
}: {
  status: ArticleStatus;
  pending: boolean;
  dirty: boolean;
  scheduledAt: Date | null;
  scheduleError?: string;
}) {
  const [scheduling, setScheduling] = useState(Boolean(scheduleError));
  const [when, setWhen] = useState(scheduledAt ? toDateTimeInputValue(scheduledAt) : "");
  const scheduleId = useId();
  const primary = "w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50";
  const secondary =
    "w-full rounded-md border border-rule px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50";

  const confirmOn = (question: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(question)) e.preventDefault();
  };

  return (
    <div className="grid gap-2">
      <button type="submit" name="intent" value="save" disabled={pending} className={secondary}>
        {pending ? "Guardando…" : status === "PUBLISHED" ? "Guardar cambios" : "Guardar borrador"}
      </button>
      {status === "PUBLISHED" && dirty ? (
        <p className={hint}>Los cambios se ven en el portal en cuanto los guardás.</p>
      ) : null}

      {canTransition("publish", status) ? (
        <button
          type="submit"
          name="intent"
          value="publish"
          disabled={pending}
          className={primary}
          onClick={confirmOn("¿Publicar la nota ahora? Va a quedar visible en el portal.")}
        >
          Publicar ahora
        </button>
      ) : null}

      {canTransition("schedule", status) ? (
        scheduling ? (
          <div className="grid gap-2 rounded-md border border-rule p-3">
            <label htmlFor={scheduleId} className={label}>
              Fecha y hora de publicación
            </label>
            <input
              id={scheduleId}
              type="datetime-local"
              name="scheduledAt"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              min={toDateTimeInputValue(new Date())}
              aria-invalid={scheduleError ? true : undefined}
              aria-describedby={scheduleError ? `${scheduleId}-error` : `${scheduleId}-hint`}
              className={field}
            />
            {scheduleError ? (
              <p id={`${scheduleId}-error`} className="text-sm text-danger">
                {scheduleError}
              </p>
            ) : (
              <p id={`${scheduleId}-hint`} className={hint}>
                Hora de Buenos Aires. El sistema la publica solo.
              </p>
            )}
            <button type="submit" name="intent" value="schedule" disabled={pending} className={primary}>
              {status === "SCHEDULED" ? "Reprogramar" : "Programar"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setScheduling(true)} className={secondary}>
            {status === "SCHEDULED" ? "Cambiar fecha" : "Programar…"}
          </button>
        )
      ) : null}

      {canTransition("unpublish", status) ? (
        <button
          type="submit"
          name="intent"
          value="unpublish"
          disabled={pending}
          className={secondary}
          onClick={
            status === "PUBLISHED"
              ? confirmOn("¿Despublicar la nota? Deja de verse en el portal y vuelve a borrador.")
              : undefined
          }
        >
          {unpublishLabel(status)}
        </button>
      ) : null}

      {canTransition("archive", status) ? (
        <button
          type="submit"
          name="intent"
          value="archive"
          disabled={pending}
          className="w-full px-4 py-2 text-sm text-ink-muted underline underline-offset-2 disabled:opacity-50"
          onClick={confirmOn("¿Archivar la nota? Sale del portal pero queda guardada.")}
        >
          Archivar
        </button>
      ) : null}
    </div>
  );
}

function DeleteArticle({
  article,
  deleteAction,
}: {
  article: EditableArticle;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  if (!canTransition("delete", article.status)) return null;
  return (
    <div className="border-t border-rule pt-6 lg:col-span-2">
      {/* formAction en vez de un form anidado: el HTML no permite forms dentro de forms. */}
      <button
        type="submit"
        formAction={deleteAction}
        formNoValidate
        className="text-sm text-danger underline underline-offset-2"
        onClick={(e) => {
          if (!window.confirm(`¿Eliminar "${article.title}" para siempre? No se puede deshacer.`)) {
            e.preventDefault();
          }
        }}
      >
        Eliminar nota
      </button>
    </div>
  );
}

function Counter({ value, max, fallback }: { value: string; max: number; fallback: string }) {
  if (!value) return <>{fallback}</>;
  return (
    <>
      {value.length} de {max} caracteres
    </>
  );
}

function Field({
  id,
  label: text,
  error,
  hint: help,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => React.ReactNode;
}) {
  const describedBy = [error ? `${id}-error` : null, help ? `${id}-hint` : null].filter(Boolean).join(" ");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children({
        id,
        ...(error ? { "aria-invalid": true } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={`${id}-hint`} className={hint}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
