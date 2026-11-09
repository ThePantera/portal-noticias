"use client";

import { useActionState } from "react";
import type { CategoryOption, ImportFormState } from "@/types/admin";

type Props = {
  categories: CategoryOption[];
  importAction: (state: ImportFormState, formData: FormData) => Promise<ImportFormState>;
};

const field =
  "w-full rounded-md border border-rule bg-surface px-3 py-2 text-base text-ink aria-invalid:border-danger";

/**
 * "Traer nota desde un link": se pega la dirección de una nota de otra página y el sitio
 * arma un borrador con su título, bajada, texto y foto, y el agradecimiento al final.
 */
export function ImportFromLink({ categories, importAction }: Props) {
  const [state, formAction, pending] = useActionState(importAction, { message: null });
  const active = categories.filter((c) => c.isActive);

  return (
    <section
      aria-labelledby="importar-titulo"
      className="grid gap-4 rounded-md border border-rule bg-surface p-4 sm:p-5"
    >
      <div>
        <h2 id="importar-titulo" className="font-display text-xl font-semibold">
          Traer nota desde un link
        </h2>
        <p className="mt-1 text-sm text-ink-subtle">
          Pegá el link de una nota de otra página. Se trae el título, la bajada, el texto y la foto, y al
          final dice «Gracias al aporte de» ese sitio. Queda como borrador para que la revises antes de
          publicar.
        </p>
      </div>
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor="import-url" className="text-sm font-semibold text-ink">
            Link de la nota
          </label>
          <input
            id="import-url"
            name="url"
            type="url"
            inputMode="url"
            required
            placeholder="https://…"
            autoComplete="off"
            aria-invalid={state.message ? true : undefined}
            aria-describedby={state.message ? "import-error" : undefined}
            className={field}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="import-category" className="text-sm font-semibold text-ink">
            Sección
          </label>
          <select id="import-category" name="categoryId" required defaultValue="" className={field}>
            <option value="" disabled>
              Elegí una sección
            </option>
            {active.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
        >
          {pending ? "Trayendo la nota…" : "Traer nota"}
        </button>
      </form>
      {state.message ? (
        <p id="import-error" role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
