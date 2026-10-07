import Link from "next/link";

type SectionHeaderProps = {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
  /** Sobre fondo oscuro (bloque destacado). */
  inverse?: boolean;
};

/** Encabezado de bloque: barra con el color de la sección, título y "Ver todas". */
export function SectionHeader({
  id,
  title,
  href,
  linkLabel = "Ver todas",
  inverse = false,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        id={id}
        className={`flex items-center gap-2.5 font-display text-xl font-extrabold tracking-tight md:text-2xl ${inverse ? "text-on-night" : "text-ink"}`}
      >
        <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-section" />
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className={`rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors ${inverse ? "border-on-night/20 text-on-night hover:bg-on-night/10" : "border-rule text-ink-muted hover:border-section hover:text-section"}`}
        >
          {linkLabel}
          <span className="sr-only"> de {title}</span>
          <span aria-hidden="true"> →</span>
        </Link>
      ) : null}
    </div>
  );
}
