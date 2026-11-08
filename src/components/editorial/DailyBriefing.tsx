import Link from "next/link";
import type { ArticleCardData } from "@/types/public";

type Props = { day: string; articles: ArticleCardData[] };

/**
 * "Lo que tenés que saber hoy": cinco titulares de temas distintos, arriba de todo en la
 * portada. En el celular es una lista; en la computadora, una fila de cinco columnas.
 */
export function DailyBriefing({ day, articles }: Props) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="saber-hoy" className="rounded-card border border-rule bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="saber-hoy" className="font-display text-xl font-extrabold tracking-tight md:text-2xl">
          Lo que tenés que saber hoy
        </h2>
        <p className="font-ui text-sm text-ink-subtle first-letter:uppercase">{day}</p>
      </div>
      <ol className="mt-3 grid gap-3 lg:grid-cols-5 lg:gap-5">
        {articles.map((article, index) => (
          <li
            key={article.id}
            className="flex gap-3 border-t border-rule pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4 lg:first:border-l-0 lg:first:pl-0"
          >
            <span
              aria-hidden="true"
              className="font-display text-2xl leading-none font-extrabold text-signal"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="kicker">{article.category.name}</p>
              <Link
                href={`/noticias/${article.slug}`}
                className="mt-1 block font-display text-base leading-snug font-bold text-ink hover:underline"
              >
                {article.title}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
