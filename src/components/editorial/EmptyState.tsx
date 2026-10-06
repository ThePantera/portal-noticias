import type { ReactNode } from "react";

/** Mensaje para cuando todavía no hay nada que mostrar. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-t border-rule py-12">
      <p className="font-display text-2xl font-semibold">{title}</p>
      {children ? <div className="mt-3 max-w-measure text-ink-muted">{children}</div> : null}
    </div>
  );
}
