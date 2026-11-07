import Link from "next/link";

type ReadershipPanelProps = {
  today: number;
  week: number;
  mostRead: { id: string; slug: string; title: string; views: number }[];
};

const number = new Intl.NumberFormat("es-AR");

/** Lecturas del sitio: hoy, últimos 7 días y las notas más leídas de la semana. */
export function ReadershipPanel({ today, week, mostRead }: ReadershipPanelProps) {
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-4">
        <div className="rounded-md border border-rule bg-surface p-4">
          <dt className="text-sm text-ink-muted">Hoy</dt>
          <dd className="mt-1 font-display text-3xl font-semibold">{number.format(today)}</dd>
        </div>
        <div className="rounded-md border border-rule bg-surface p-4">
          <dt className="text-sm text-ink-muted">Últimos 7 días</dt>
          <dd className="mt-1 font-display text-3xl font-semibold">{number.format(week)}</dd>
        </div>
      </dl>
      {mostRead.length > 0 ? (
        <ol className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule">
          {mostRead.map((article, index) => (
            <li key={article.id} className="flex items-baseline gap-3 bg-surface p-4">
              <span className="font-display text-xl font-bold text-ink-subtle">{index + 1}</span>
              <a
                href={`/noticias/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 font-medium hover:underline"
              >
                {article.title}
              </a>
              <span className="text-sm whitespace-nowrap text-ink-muted">
                {number.format(article.views)} {article.views === 1 ? "lectura" : "lecturas"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-muted">
          Todavía no hay lecturas registradas. Se cuentan desde que se activó la medición.
        </p>
      )}
      <p className="text-xs text-ink-subtle">
        Una lectura es una nota abierta en un navegador (no cuenta buscadores ni recargas).{" "}
        <Link href="/admin/mensajes" className="underline">
          Ver mensajes de contacto
        </Link>
      </p>
    </div>
  );
}
