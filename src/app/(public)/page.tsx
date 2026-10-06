import { ArticleCard } from "@/components/editorial/ArticleCard";
import { SectionHeader } from "@/components/editorial/SectionHeader";
import { getHomepage } from "@/server/services/public-content";

export default async function HomePage() {
  const { lead, secondary, latest: recent, sections } = await getHomepage();
  const underLead = recent.slice(0, 2);
  const latest = recent.slice(2);

  if (!lead) {
    return (
      <section className="mx-auto max-w-site px-4 py-16 md:px-8">
        <p className="kicker">Portada</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight font-semibold md:text-5xl">
          Todavía no hay noticias publicadas
        </h1>
        <p className="mt-4 max-w-measure font-body text-md text-ink-muted">
          Cuando se publique la primera nota desde el panel de administración, va a aparecer acá.
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto grid max-w-site gap-12 px-4 py-8 md:px-8 md:py-10">
      <h1 className="sr-only">Portada</h1>

      <section aria-label="Principales" className="grid gap-8 lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-8">
          <ArticleCard article={lead} variant="lead" headingLevel="h2" />
        </div>
        {secondary.length > 0 ? (
          <ul className="grid content-start gap-6 border-t border-rule pt-6 md:grid-cols-3 lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            {secondary.map((article, i) => (
              <li
                key={article.id}
                className={
                  i > 0 ? "border-t border-rule pt-6 md:border-t-0 md:pt-0 lg:border-t lg:pt-6" : undefined
                }
              >
                <ArticleCard article={article} variant="secondary" headingLevel="h2" />
              </li>
            ))}
          </ul>
        ) : null}
        {/* Sin imágenes, la principal deja aire debajo: en escritorio lo ocupan las dos más recientes. */}
        {underLead.length > 0 ? (
          <ul className="grid content-start gap-6 border-t border-rule pt-6 md:grid-cols-2 md:gap-8 lg:col-span-8 lg:row-start-2">
            {underLead.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} variant="compact" headingLevel="h2" />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {latest.length > 0 ? (
        <section aria-labelledby="ultimas" className="grid gap-6">
          <SectionHeader id="ultimas" title="Últimas noticias" />
          <ul className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} variant="list" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map(({ category, articles }) => (
        <section key={category.slug} aria-labelledby={`seccion-${category.slug}`} className="grid gap-6">
          <SectionHeader
            id={`seccion-${category.slug}`}
            title={category.name}
            href={`/categoria/${category.slug}`}
          />
          <ul className="grid gap-x-8 gap-y-6 md:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} variant="compact" showCategory={false} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
