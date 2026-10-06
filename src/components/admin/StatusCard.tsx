import Link from "next/link";
import type { ArticleStatus } from "@/types/article";
import { ARTICLE_STATUS } from "@/lib/article-status";

type StatusCardProps = { status: ArticleStatus; count: number };

export function StatusCard({ status, count }: StatusCardProps) {
  const { label, description, colorClass } = ARTICLE_STATUS[status];
  return (
    <Link
      href={`/admin/notas?estado=${status.toLowerCase()}`}
      className="grid gap-1 rounded-md border border-rule bg-surface p-4 hover:border-ink-subtle"
    >
      <span
        className={`flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${colorClass}`}
      >
        <span aria-hidden className="size-2 rounded-full bg-current" />
        {label}
      </span>
      <span className="font-display text-3xl font-semibold tabular-nums">{count}</span>
      <span className="text-sm text-ink-muted">{description}</span>
    </Link>
  );
}
