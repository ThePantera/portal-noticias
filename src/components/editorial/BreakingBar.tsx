import Link from "next/link";
import type { ArticleCardData } from "@/types/public";

/**
 * Cinta de "Último momento" arriba de la portada: las notas más recientes en una sola línea.
 * En el celular entra una; en la computadora, hasta tres. Los títulos largos se cortan con
 * puntos suspensivos, así la cinta nunca se desborda.
 */
export function BreakingBar({ articles }: { articles: ArticleCardData[] }) {
  if (articles.length === 0) return null;
  return (
    <section
      aria-labelledby="ultimo-momento"
      className="flex min-w-0 items-stretch overflow-hidden rounded-card border border-rule bg-surface shadow-card"
    >
      <h2
        id="ultimo-momento"
        className="flex shrink-0 items-center gap-2 bg-signal px-3 py-2 text-xs font-extrabold tracking-wide text-on-signal uppercase md:px-4"
      >
        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-on-signal" />
        Último momento
      </h2>
      <ul className="flex min-w-0 flex-1 items-center divide-x divide-rule">
        {articles.map((article, i) => (
          <li
            key={article.id}
            className={`min-w-0 flex-1 px-3 py-2 md:px-4 ${i > 0 ? "hidden" : ""} ${i === 1 ? "md:block" : ""} ${i === 2 ? "lg:block" : ""}`}
          >
            <Link
              href={`/noticias/${article.slug}`}
              className="block truncate text-sm font-semibold text-ink hover:text-accent"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
