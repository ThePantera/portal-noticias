import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticleBody } from "@/components/editorial/ArticleBody";
import { ArticleCard } from "@/components/editorial/ArticleCard";
import { ArticleFigure } from "@/components/editorial/ArticleImage";
import { ArticleMeta } from "@/components/editorial/ArticleMeta";
import { JsonLd } from "@/components/editorial/JsonLd";
import { SectionHeader } from "@/components/editorial/SectionHeader";
import { ShareButtons } from "@/components/editorial/ShareButtons";
import { FEED_ALTERNATE_TYPES, breadcrumbJsonLd, newsArticleJsonLd } from "@/lib/seo";
import { env } from "@/server/env";
import { getArticleBySlug, getRecentSlugs, getRelatedArticles } from "@/server/services/public-content";

// Con cacheComponents hace falta al menos un parámetro. Con la base vacía se usa uno
// que no existe: esa ruta da 404 y el resto se genera en la primera visita.
const PLACEHOLDER = "sin-notas-todavia";

export async function generateStaticParams() {
  const slugs = await getRecentSlugs();
  return (slugs.length ? slugs : [PLACEHOLDER]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/noticias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getArticleBySlug(slug);
  if (result.kind !== "article") return { title: "Nota no encontrada", robots: { index: false } };
  const article = result.article;
  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const path = `/noticias/${article.slug}`;
  const image = article.image;
  const ogImage = image
    ? image.ogUrl
      ? { url: image.ogUrl, width: 1200, height: 630, alt: image.alt }
      : { url: image.src, width: image.width, height: image.height, alt: image.alt }
    : null;
  return {
    title,
    description,
    alternates: { canonical: path, types: FEED_ALTERNATE_TYPES },
    openGraph: {
      type: "article",
      url: path,
      title,
      description,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      section: article.category.name,
      authors: [article.authorName],
      tags: article.tags.map((t) => t.name),
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: ogImage
      ? { card: "summary_large_image", title, description, images: [ogImage.url] }
      : { card: "summary", title, description },
  };
}

/**
 * Sin Suspense alrededor de los parámetros: todo lo que lee está en caché y la ruta tiene
 * generateStaticParams, así que una dirección inexistente responde con un 404 de verdad.
 */
export default async function ArticlePage({ params }: PageProps<"/noticias/[slug]">) {
  const { slug } = await params;
  const result = await getArticleBySlug(slug);
  if (result.kind === "redirect") permanentRedirect(`/noticias/${result.slug}`);
  if (result.kind === "missing") notFound();
  const { article } = result;
  const related = await getRelatedArticles(article.id);
  const url = new URL(`/noticias/${article.slug}`, env.SITE_URL).toString();

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <JsonLd
        data={[
          newsArticleJsonLd({
            siteUrl: env.SITE_URL,
            siteName: env.SITE_NAME,
            slug: article.slug,
            title: article.seoTitle || article.title,
            description: article.seoDescription || article.excerpt,
            publishedAt: article.publishedAt,
            updatedAt: article.updatedAt,
            authorName: article.authorName,
            section: article.category.name,
            keywords: article.tags.map((t) => t.name),
            images: article.image
              ? [article.image.src, ...(article.image.ogUrl ? [article.image.ogUrl] : [])]
              : undefined,
          }),
          breadcrumbJsonLd(env.SITE_URL, [
            { name: "Portada", path: "/" },
            { name: article.category.name, path: `/categoria/${article.category.slug}` },
            { name: article.title, path: `/noticias/${article.slug}` },
          ]),
        ]}
      />
      <article className="mx-auto w-full max-w-measure">
        <nav aria-label="Ruta" className="text-sm">
          <Link href={`/categoria/${article.category.slug}`} className="kicker hover:underline">
            {article.category.name}
          </Link>
        </nav>
        <h1 className="mt-3 font-display text-3xl leading-tight font-semibold md:text-5xl">
          {article.title}
        </h1>
        {article.excerpt ? (
          <p className="mt-4 font-body text-xl leading-snug text-ink-muted">{article.excerpt}</p>
        ) : null}
        <div className="mt-6 grid gap-3 border-y border-rule py-3">
          <ArticleMeta
            authorName={article.authorName}
            publishedAt={article.publishedAt}
            readingTimeMinutes={article.readingTimeMinutes}
            withTime
          />
          <ShareButtons url={url} title={article.title} />
        </div>
        {article.image ? (
          <ArticleFigure
            image={article.image}
            sizes="(min-width: 768px) 40rem, 100vw"
            priority
            className="mt-8"
          />
        ) : null}
        <ArticleBody content={article.content} className="mt-8" />
        {article.tags.length > 0 ? (
          <div className="mt-10 border-t border-rule pt-6">
            <h2 className="sr-only">Etiquetas</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {article.tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/tag/${tag.slug}`}
                    className="inline-flex min-h-9 items-center rounded-sm border border-rule px-2.5 text-ink-muted hover:border-ink hover:text-ink"
                  >
                    {tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>

      {related.length > 0 ? (
        <section aria-labelledby="relacionadas" className="mx-auto mt-16 grid w-full max-w-site gap-6">
          <SectionHeader id="relacionadas" title="Seguí leyendo" />
          <ul className="grid gap-x-8 gap-y-6 md:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <ArticleCard article={item} variant="compact" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
