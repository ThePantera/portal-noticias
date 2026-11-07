import type { ReactNode } from "react";

type InfoPageProps = { kicker: string; title: string; intro?: string; children: ReactNode };

/** Página institucional de texto (quiénes somos, privacidad, contacto): columna de lectura con título. */
export function InfoPage({ kicker, title, intro, children }: InfoPageProps) {
  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <article className="mx-auto w-full max-w-measure">
        <header className="border-b border-rule pb-6">
          <p className="kicker">{kicker}</p>
          <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight md:text-5xl">
            {title}
          </h1>
          {intro ? <p className="mt-4 font-body text-xl leading-snug text-ink-muted">{intro}</p> : null}
        </header>
        <div className="mt-6 article-body">{children}</div>
      </article>
    </div>
  );
}
