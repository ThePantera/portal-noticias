import Link from "next/link";

type SectionHeaderProps = {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
  /** Sobre fondo oscuro (bloque destacado). */
  inverse?: boolean;
};

/** Encabezado de bloque como en un diario: filete negro, título en versalitas espaciadas y "Ver todas". */
export function SectionHeader({
  id,
  title,
  href,
  linkLabel = "Ver todas",
  inverse = false,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t-2 border-ink pt-2">
      <h2
        id={id}
        className={`font-display text-base font-bold tracking-widest uppercase md:text-lg ${inverse ? "text-on-night" : "text-ink"}`}
      >
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className={`text-sm font-bold whitespace-nowrap transition-colors ${inverse ? "text-on-night hover:underline" : "text-ink-muted hover:text-ink hover:underline"}`}
        >
          {linkLabel}
          <span className="sr-only"> de {title}</span>
          <span aria-hidden="true"> →</span>
        </Link>
      ) : null}
    </div>
  );
}
