import { liveUpdateParagraphs } from "@/lib/article-extras";
import { formatDayMonth, formatTime, toIsoString } from "@/lib/dates";
import type { LiveUpdate } from "@/types/public";

type Props = { updates: LiveUpdate[]; isLive: boolean; className?: string };

/** Actualizaciones de una cobertura en vivo, la más nueva arriba, con su hora. */
export function LiveUpdates({ updates, isLive, className = "" }: Props) {
  if (updates.length === 0) return null;
  return (
    <section aria-labelledby="minuto-a-minuto" className={`border-y border-rule py-6 ${className}`}>
      <h2
        id="minuto-a-minuto"
        className="flex items-center gap-2 font-ui text-sm font-bold tracking-wide uppercase"
      >
        {isLive ? <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-live" /> : null}
        {isLive ? "Minuto a minuto" : "Así lo contamos"}
      </h2>
      <ol className="mt-4 grid gap-0">
        {updates.map((update) => (
          <li key={update.id} className="relative grid gap-1 border-l-2 border-rule pb-6 pl-5 last:pb-0">
            <span aria-hidden="true" className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-ink" />
            <time dateTime={toIsoString(update.createdAt)} className="font-ui text-sm font-bold text-ink">
              {formatTime(update.createdAt)}
              <span className="ml-2 font-normal text-ink-subtle">{formatDayMonth(update.createdAt)}</span>
            </time>
            {liveUpdateParagraphs(update.body).map((paragraph, index) => (
              <p key={index} className="font-body text-lg leading-relaxed whitespace-pre-line text-ink">
                {paragraph}
              </p>
            ))}
          </li>
        ))}
      </ol>
    </section>
  );
}
