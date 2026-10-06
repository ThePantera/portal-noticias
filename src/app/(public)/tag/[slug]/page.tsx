import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleList } from "@/components/editorial/ArticleList";
import { Pagination } from "@/components/editorial/Pagination";
import { pageParam } from "@/lib/search-params";
import { FEED_ALTERNATE_TYPES } from "@/lib/seo";
import { getTagPage } from "@/server/services/public-content";

// Las etiquetas se generan en la primera visita; ésta sólo cumple con cacheComponents.
export function generateStaticParams() {
  return [{ slug: "sin-etiqueta" }];
}

export async function generateMetadata({ params }: PageProps<"/tag/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTagPage(slug, 1);
  if (!result) return { title: "Etiqueta no encontrada", robots: { index: false } };
  return {
    title: result.tag.name,
    description: `Notas sobre ${result.tag.name}.`,
    alternates: { canonical: `/tag/${result.tag.slug}`, types: FEED_ALTERNATE_TYPES },
  };
}

async function TagArticles({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps<"/tag/[slug]">["searchParams"];
}) {
  const result = await getTagPage(slug, pageParam((await searchParams).pagina));
  if (!result) notFound();
  return (
    <>
      <ArticleList articles={result.articles} />
      <Pagination basePath={`/tag/${slug}`} page={result.page} pageCount={result.pageCount} />
    </>
  );
}

/** Igual que las secciones: la etiqueta se valida afuera del Suspense para dar un 404 real. */
export default async function TagPage({ params, searchParams }: PageProps<"/tag/[slug]">) {
  const { slug } = await params;
  const first = await getTagPage(slug, 1);
  if (!first) notFound();
  const { tag, total } = first;

  return (
    <div className="mx-auto grid max-w-site gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="border-b-2 border-ink pb-4">
        <p className="kicker">Etiqueta</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{tag.name}</h1>
        <p className="mt-2 text-sm text-ink-subtle">{total === 1 ? "1 nota" : `${total} notas`}</p>
      </header>
      <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando las notas…</p>}>
        <TagArticles slug={tag.slug} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
