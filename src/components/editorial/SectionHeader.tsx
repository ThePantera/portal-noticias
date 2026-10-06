import Link from "next/link";

type SectionHeaderProps = { id: string; title: string; href?: string; linkLabel?: string };

/** Encabezado de bloque: filete grueso, nombre en versalitas y "Ver todas". */
export function SectionHeader({ id, title, href, linkLabel = "Ver todas" }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
      <h2 id={id} className="text-sm font-bold tracking-wide uppercase">
        {title}
      </h2>
      {href ? (
        <Link href={href} className="text-sm font-medium whitespace-nowrap text-accent hover:underline">
          {linkLabel}
          <span className="sr-only"> de {title}</span>
        </Link>
      ) : null}
    </div>
  );
}
