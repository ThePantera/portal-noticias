"use client";

import { useId, useRef, useState, useTransition } from "react";
import { GALLERY_MAX_IMAGES, GALLERY_TEXT_MAX_LENGTH } from "@/lib/article-extras";
import { prepareImageForUpload } from "@/lib/image-prep";
import type { ExtrasResult } from "@/types/admin";
import type { EditorImage, UploadImageResult } from "@/types/media";

type Action = (formData: FormData) => Promise<ExtrasResult>;

type Props = {
  articleId: string;
  images: EditorImage[];
  uploadAction: (formData: FormData) => Promise<UploadImageResult>;
  addAction: Action;
  removeAction: Action;
  moveAction: Action;
};

const field = "w-full rounded-md border border-rule bg-paper px-3 py-2 text-base text-ink";
const button =
  "inline-flex min-h-10 items-center rounded-md border border-rule px-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50";
const small = "text-sm text-ink-muted hover:text-ink disabled:opacity-40";

/**
 * Galería de fotos de la nota: se ve debajo del cuerpo, con flechas para pasar de una a otra.
 * Cada foto se sube, se describe y se agrega; los cambios salen al instante si la nota está
 * publicada.
 */
export function GalleryPanel({
  articleId,
  images,
  uploadAction,
  addAction,
  removeAction,
  moveAction,
}: Props) {
  const [draft, setDraft] = useState<EditorImage | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const full = images.length >= GALLERY_MAX_IMAGES;

  function upload(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    start(async () => {
      try {
        const formData = new FormData();
        formData.append("file", await prepareImageForUpload(file), file.name);
        const result = await uploadAction(formData);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setDraft(result.image);
        setAlt(result.image.alt);
        setCaption(result.image.caption ?? "");
        setCredit(result.image.credit ?? "");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "No se pudo subir la imagen.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function send(action: Action, fields: Record<string, string>, onDone?: () => void) {
    setMessage(null);
    start(async () => {
      const formData = new FormData();
      formData.set("articleId", articleId);
      for (const [name, value] of Object.entries(fields)) formData.set(name, value);
      try {
        const result = await action(formData);
        if (result.ok) onDone?.();
        else setMessage(result.message);
      } catch {
        setMessage("No se pudo guardar. Revisá la conexión y probá de nuevo.");
      }
    });
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid gap-4 rounded-md border border-rule bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-xl font-semibold">
          Galería de fotos
        </h2>
        <span className="text-sm text-ink-subtle">
          {images.length}/{GALLERY_MAX_IMAGES}
        </span>
      </div>

      {images.length > 0 ? (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="grid gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- variantes propias con srcset */}
              <img
                src={image.src}
                srcSet={image.srcSet}
                sizes="12rem"
                width={image.width}
                height={image.height}
                alt={image.alt}
                className="aspect-[4/3] w-full rounded-md border border-rule bg-paper object-cover"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className={small}
                  disabled={pending || index === 0}
                  aria-label={`Mover la foto ${index + 1} antes`}
                  onClick={() => send(moveAction, { mediaId: image.id, step: "-1" })}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="text-sm text-ink-muted hover:text-danger"
                  disabled={pending}
                  onClick={() => send(removeAction, { mediaId: image.id })}
                >
                  Quitar
                </button>
                <button
                  type="button"
                  className={small}
                  disabled={pending || index === images.length - 1}
                  aria-label={`Mover la foto ${index + 1} después`}
                  onClick={() => send(moveAction, { mediaId: image.id, step: "1" })}
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-subtle">Sin fotos todavía. Aparecen debajo del cuerpo de la nota.</p>
      )}

      {draft ? (
        <form
          className="grid gap-3 border-t border-rule pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(addAction, { mediaId: draft.id, alt, caption, credit }, () => setDraft(null));
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- variantes propias con srcset */}
          <img
            src={draft.src}
            srcSet={draft.srcSet}
            sizes="20rem"
            width={draft.width}
            height={draft.height}
            alt={alt || "Foto nueva sin descripción"}
            className="aspect-[4/3] w-full max-w-80 rounded-md border border-rule bg-paper object-cover"
          />
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Descripción (obligatoria)
            <input
              className={field}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={GALLERY_TEXT_MAX_LENGTH}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Epígrafe
            <input
              className={field}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={GALLERY_TEXT_MAX_LENGTH}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-ink">
            Crédito
            <input
              className={field}
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              maxLength={GALLERY_TEXT_MAX_LENGTH}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={button} disabled={pending || !alt.trim()}>
              Agregar a la galería
            </button>
            <button type="button" className={button} disabled={pending} onClick={() => setDraft(null)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div>
          <label htmlFor={`${id}-file`} className={`${button} ${full ? "opacity-50" : "cursor-pointer"}`}>
            {pending ? "Subiendo…" : "Subir una foto"}
          </label>
          <input
            ref={inputRef}
            id={`${id}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
            className="sr-only"
            disabled={pending || full}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
      )}

      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
