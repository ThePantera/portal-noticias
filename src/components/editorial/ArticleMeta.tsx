import { formatDate, formatDateTime, toIsoString } from "@/lib/dates";

type ArticleMetaProps = {
  authorName?: string;
  publishedAt: Date;
  readingTimeMinutes?: number;
  withTime?: boolean;
  className?: string;
  /** "inverse" sobre fondos oscuros (la portada sobre foto, el bloque Gaming). */
  tone?: "default" | "inverse";
};

/** Firma de una nota: autor, fecha y tiempo de lectura. La fecha siempre en hora de Buenos Aires. */
export function ArticleMeta({
  authorName,
  publishedAt,
  readingTimeMinutes,
  withTime = false,
  className = "",
  tone = "default",
}: ArticleMetaProps) {
  const strong = tone === "inverse" ? "text-on-night" : "text-ink";
  const parts = [
    authorName ? (
      <span key="author">
        Por <span className={`font-semibold ${strong}`}>{authorName}</span>
      </span>
    ) : null,
    <time key="date" dateTime={toIsoString(publishedAt)}>
      {withTime ? formatDateTime(publishedAt) : formatDate(publishedAt)}
    </time>,
    readingTimeMinutes ? <span key="reading">{readingTimeMinutes} min de lectura</span> : null,
  ].filter(Boolean);

  return (
    <p
      className={`flex flex-wrap gap-x-2 text-sm ${tone === "inverse" ? "text-on-night-muted" : "text-ink-subtle"} ${className}`}
    >
      {parts.map((part, i) => (
        <span key={i} className="flex gap-x-2">
          {i > 0 ? <span aria-hidden="true">·</span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}
