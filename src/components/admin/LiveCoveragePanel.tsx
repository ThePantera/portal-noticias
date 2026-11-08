"use client";

import { useId, useState, useTransition } from "react";
import { LIVE_UPDATE_MAX_LENGTH } from "@/lib/article-extras";
import type { ExtrasResult } from "@/types/admin";

type Action = (formData: FormData) => Promise<ExtrasResult>;

type Props = {
  articleId: string;
  isLive: boolean;
  /** Actualizaciones, la más nueva primero; `when` ya viene formateado en hora de Buenos Aires. */
  updates: { id: string; body: string; when: string }[];
  setLiveAction: Action;
  addAction: Action;
  deleteAction: Action;
};

const button =
  "inline-flex min-h-10 items-center rounded-md border border-rule px-3 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-50";

const LIVE_ON =
  "La nota muestra «En vivo» y se refresca sola cada minuto. Las actualizaciones salen al instante.";
const LIVE_OFF = "Activala para seguir un hecho minuto a minuto: un partido, una elección, un temporal.";

/**
 * Cobertura en vivo de una nota: se activa, se suman actualizaciones cortas (salen al
 * instante, la más nueva arriba) y se borran las que tengan un error.
 */
export function LiveCoveragePanel({
  articleId,
  isLive,
  updates,
  setLiveAction,
  addAction,
  deleteAction,
}: Props) {
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = useId();

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
          Cobertura en vivo
        </h2>
        <button
          type="button"
          className={button}
          disabled={pending}
          aria-pressed={isLive}
          onClick={() => send(setLiveAction, { isLive: String(!isLive) })}
        >
          {isLive ? "Terminar cobertura" : "Activar cobertura"}
        </button>
      </div>
      <p className="text-sm text-ink-subtle">{isLive ? LIVE_ON : LIVE_OFF}</p>

      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(addAction, { body }, () => setBody(""));
        }}
      >
        <label htmlFor={`${id}-body`} className="text-sm font-semibold text-ink">
          Nueva actualización
        </label>
        <textarea
          id={`${id}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={LIVE_UPDATE_MAX_LENGTH}
          className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-base text-ink"
          placeholder="Qué pasó, en pocas líneas. Una línea en blanco separa párrafos."
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={button} disabled={pending || !body.trim()}>
            {pending ? "Guardando…" : "Publicar actualización"}
          </button>
          <span className="text-sm text-ink-subtle">
            {body.length}/{LIVE_UPDATE_MAX_LENGTH}
          </span>
        </div>
      </form>

      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}

      {updates.length > 0 ? (
        <ol className="grid gap-3">
          {updates.map((update) => (
            <li key={update.id} className="grid gap-1 border-t border-rule pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{update.when}</span>
                <button
                  type="button"
                  className="text-sm text-ink-muted hover:text-danger"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("¿Borrar esta actualización?")) send(deleteAction, { updateId: update.id });
                  }}
                >
                  Borrar
                </button>
              </div>
              <p className="text-sm whitespace-pre-line text-ink">{update.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
