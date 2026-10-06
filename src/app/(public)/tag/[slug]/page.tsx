import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleList } from "@/components/editorial/ArticleList";
import { Pagination } from "@/components/editorial/Pagination";
import { pageParam } from "@/lib/search-params";
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
    alternates: { canonical: `/tag/${result.tag.slug}` },
  };
}

async function TagView({ params, searchParams }: PageProps<"/tag/[slug]">) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const result = await getTagPage(slug, pageParam(search.pagina));
  if (!result) notFound();
  const { tag, articles, page, pageCount, total } = result;

  return (
    <>
      <header className="border-b-2 border-ink pb-4">
        <p className="kicker">Etiqueta</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{tag.name}</h1>
        <p className="mt-2 text-sm text-ink-subtle">{total === 1 ? "1 nota" : `${total} notas`}</p>
      </header>
      <ArticleList articles={articles} />
      <Pagination basePath={`/tag/${tag.slug}`} page={page} pageCount={pageCount} />
    </>
  );
}

export default function TagPage(props: PageProps<"/tag/[slug]">) {
  return (
    <div className="mx-auto grid max-w-site gap-8 px-4 py-8 md:px-8 md:py-10">
      <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando la etiqueta…</p>}>
        <TagView {...props} />
      </Suspense>
    </div>
  );
}
