"use client";

/** Último recurso si falla el layout raíz: HTML mínimo, sin dependencias. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{ fontFamily: "Georgia, serif", padding: "4rem 1rem", maxWidth: "40rem", margin: "0 auto" }}
      >
        <h1>No pudimos cargar el sitio</h1>
        <p>Probá de nuevo en unos segundos.</p>
        <button type="button" onClick={reset}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
