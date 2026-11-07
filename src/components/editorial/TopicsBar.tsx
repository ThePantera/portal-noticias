import Link from "next/link";
import type { TagLink } from "@/types/public";

/**
 * "Temas del día": las etiquetas que más se repiten en las notas recientes, en una fila que
 * se desliza con el dedo en el celular. Con menos de tres temas no se muestra.
 */
export function TopicsBar({ topics }: { topics: TagLink[] }) {
  if (topics.length < 3) return null;
  return (
    <nav aria-labelledby="temas-del-dia" className="flex min-w-0 items-center gap-3">
      <h2 id="temas-del-dia" className="shrink-0 kicker">
        Temas del día
      </h2>
      <ul className="no-scrollbar flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain">
        {topics.map((topic) => (
          <li key={topic.slug} className="shrink-0">
            <Link
              href={`/tag/${topic.slug}`}
              className="inline-flex min-h-9 items-center rounded-full border border-rule bg-surface px-3 text-sm font-medium text-ink hover:border-ink"
            >
              {topic.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
