import type { ArticleStatus } from "@/types/article";
import { ARTICLE_STATUS } from "@/lib/article-status";

/** Punto de color más nombre del estado: se distingue sin depender sólo del color. */
export function StatusBadge({ status }: { status: ArticleStatus }) {
  const { label, colorClass } = ARTICLE_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${colorClass}`}
    >
      <span aria-hidden className="size-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
