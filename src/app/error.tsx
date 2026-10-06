"use client";

import { useEffect } from "react";

/** Error de una página. Nunca muestra detalles técnicos al lector. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-site flex-1 flex-col justify-center px-4 py-24 md:px-8">
      <p className="kicker">Error</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">No pudimos cargar esta página</h1>
      <p className="mt-4 max-w-measure text-ink-muted">Probá de nuevo en unos segundos.</p>
      {error.digest ? <p className="mt-2 text-sm text-ink-subtle">Código: {error.digest}</p> : null}
      <button
        type="button"
        onClick={reset}
        className="mt-8 w-fit rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-paper"
      >
        Reintentar
      </button>
    </main>
  );
}
