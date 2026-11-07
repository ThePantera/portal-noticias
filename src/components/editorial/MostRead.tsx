import Link from "next/link";
import { sectionTone } from "@/lib/sections";
import type { MostReadArticle } from "@/types/public";
import { SectionHeader } from "./SectionHeader";

type MostReadProps = {
  articles: MostReadArticle[];
  /** "column" para la columna lateral; "row" reparte las cinco a lo ancho en la computadora. */
  layout?: "column" | "row";
  className?: string;
};

/**
 * "Lo más leído": las notas con más lecturas de los últimos días, numeradas con cifras
 * grandes como en el papel. Sin datos no se muestra. El título es el enlace y se estira
 * sobre toda la fila, como en las tarjetas.
 */
export function MostRead({ articles, layout = "column", className = "" }: MostReadProps) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="lo-mas-leido" className={`grid min-w-0 content-start gap-3 ${className}`}>
      <SectionHeader id="lo-mas-leido" title="Lo más leído" />
      <ol className={`grid ${layout === "row" ? "md:grid-cols-2 md:gap-x-6 lg:grid-cols-5" : ""}`}>
        {articles.map((article, index) => (
          <li
            key={article.id}
            style={sectionTone(article.category.slug)}
            className="group relative flex min-w-0 items-start gap-3 border-t border-rule py-3"
          >
            <span
              aria-hidden="true"
              className="w-8 shrink-0 text-center font-display text-2xl leading-none font-extrabold text-ink-subtle tabular-nums"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="kicker">{article.category.name}</p>
              <h3
                className="mt-1 font-display text-base leading-snug font-bold tracking-tight text-ink decoration-1 underline-offset-4 group-hover:underline"
              >
                <Link href={`/noticias/${article.slug}`} className="after:absolute after:inset-0">
                  {article.title}
                </Link>
              </h3>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
