import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleList } from "@/components/editorial/ArticleList";
import { EmptyState } from "@/components/editorial/EmptyState";
import { Pagination } from "@/components/editorial/Pagination";
import { pageParam } from "@/lib/search-params";
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
    alternates: { canonical: `/categoria/${category.slug}` },
  };
}

async function CategoryView({ params, searchParams }: PageProps<"/categoria/[slug]">) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const result = await getCategoryPage(slug, pageParam(search.pagina));
  if (!result) notFound();
  const { category, articles, page, pageCount } = result;

  return (
    <>
      <header className="border-b-2 border-ink pb-4">
        <p className="kicker">Sección</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">{category.name}</h1>
        {category.description ? (
          <p className="mt-2 max-w-measure text-ink-muted">{category.description}</p>
        ) : null}
      </header>
      {articles.length > 0 ? (
        <ArticleList articles={articles} showCategory={false} />
      ) : (
        <EmptyState title={page > 1 ? "No hay más notas" : "Todavía no hay notas en esta sección"} />
      )}
      <Pagination basePath={`/categoria/${category.slug}`} page={page} pageCount={pageCount} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  return (
    <div className="mx-auto grid max-w-site gap-8 px-4 py-8 md:px-8 md:py-10">
      <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando la sección…</p>}>
        <CategoryView {...props} />
      </Suspense>
    </div>
  );
}
