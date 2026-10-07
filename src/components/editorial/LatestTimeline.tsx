import Link from "next/link";
import { formatDayMonth, formatTime, toIsoString } from "@/lib/dates";
import { sectionTone } from "@/lib/sections";
import type { ArticleCardData } from "@/types/public";

/** "Minuto a minuto": las últimas notas con su hora, para el panel de la portada. */
export function LatestTimeline({ articles }: { articles: ArticleCardData[] }) {
  if (articles.length === 0) return null;
  return (
    <section
      aria-labelledby="minuto-a-minuto"
      className="rounded-card border border-rule bg-surface p-5 shadow-card"
    >
      <h2 id="minuto-a-minuto" className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
        <span aria-hidden="true" className="size-2 rounded-full bg-live" />
        Minuto a minuto
      </h2>
      <ol className="mt-4 grid">
        {articles.map((article) => (
          <li
            key={article.id}
            style={sectionTone(article.category.slug)}
            className="relative grid grid-cols-[3.25rem_1fr] gap-3 border-l-2 border-rule pb-4 pl-4 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-section"
            />
            <time dateTime={toIsoString(article.publishedAt)} className="text-xs leading-5 text-ink-subtle">
              <span className="block font-semibold text-ink tabular-nums">
                {formatTime(article.publishedAt)}
              </span>
              {formatDayMonth(article.publishedAt)}
            </time>
            <div className="min-w-0">
              <p className="kicker">{article.category.name}</p>
              <Link
                href={`/noticias/${article.slug}`}
                className="mt-0.5 block text-sm leading-snug font-semibold hover:text-accent"
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
