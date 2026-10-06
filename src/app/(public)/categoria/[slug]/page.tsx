import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleList } from "@/components/editorial/ArticleList";
import { EmptyState } from "@/components/editorial/EmptyState";
import { JsonLd } from "@/components/editorial/JsonLd";
import { Pagination } from "@/components/editorial/Pagination";
import { pageParam } from "@/lib/search-params";
import { FEED_ALTERNATE_TYPES, breadcrumbJsonLd } from "@/lib/seo";
import { env } from "@/server/env";
import { getCategoryPage, getNavCategories } from "@/server/services/public-content";

export async function generateStaticParams() {
  const categories = await getNavCategories();
  return (categories.length ? categories : [{ slug: "sin-secciones" }]).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCategoryPage(slug, 1);
  if (!result) return { title: "Sección no encontrada", robots: { index: false } };
  const { category } = result;
  return {
    title: category.seoTitle || category.name,
    description: category.seoDescription || category.description || `Últimas noticias de ${category.name}.`,
    alternates: { canonical: `/categoria/${category.slug}`, types: FEED_ALTERNATE_TYPES },
  };
}

async function CategoryArticles({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps<"/categoria/[slug]">["searchParams"];
}) {
  const result = await getCategoryPage(slug, pageParam((await searchParams).pagina));
  if (!result) notFound();
  const { articles, page, pageCount } = result;
  return (
    <>
      {articles.length > 0 ? (
        <ArticleList articles={articles} showCategory={false} />
      ) : (
        <EmptyState title={page > 1 ? "No hay más notas" : "Todavía no hay notas en esta sección"} />
      )}
      <Pagination basePath={`/categoria/${slug}`} page={page} pageCount={pageCount} />
    </>
  );
}

/**
 * La sección se busca afuera del Suspense (está en caché): si no existe, la respuesta es
 * un 404 de verdad. Sólo el paginado, que lee `?pagina=`, se resuelve al pedir la página.
 */
export default async function CategoryPage({ params, searchParams }: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  const first = await getCategoryPage(slug, 1);
  if (!first) notFound();
  const { category } = first;

  return (
    <div className="mx-auto grid max-w-site gap-8 px-4 py-8 md:px-8 md:py-10">
      <JsonLd
        data={breadcrumbJsonLd(env.SITE_URL, [
          { name: "Portada", path: "/" },
          { name: category.name, path: `/categoria/${category.slug}` },
        ])}
      />
      <header className="border-b-2 border-ink pb-4">
        <p className="kicker">Sección</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{category.name}</h1>
        {category.description ? (
          <p className="mt-2 max-w-measure text-ink-muted">{category.description}</p>
        ) : null}
      </header>
      <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando las notas…</p>}>
        <CategoryArticles slug={category.slug} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
