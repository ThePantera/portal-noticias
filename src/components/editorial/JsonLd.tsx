import { serializeJsonLd } from "@/lib/seo";

/** Bloque de datos estructurados. El contenido sale de `serializeJsonLd`, que lo escapa. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
