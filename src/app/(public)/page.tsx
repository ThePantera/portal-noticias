import { ArticleCard } from "@/components/editorial/ArticleCard";
import { DollarPanel } from "@/components/editorial/DollarPanel";
import { JsonLd } from "@/components/editorial/JsonLd";
import { LatestTimeline } from "@/components/editorial/LatestTimeline";
import { SectionHeader } from "@/components/editorial/SectionHeader";
import { isFeaturedSection, sectionTone } from "@/lib/sections";
import { websiteJsonLd } from "@/lib/seo";
import { env } from "@/server/env";
import { getDollarRates } from "@/server/services/exchange-rates";
import { getHomepage } from "@/server/services/public-content";

/**
 * Portada en forma de panel: arriba la nota principal y, al costado, el dólar en vivo y el
 * minuto a minuto. Después las secundarias, las últimas y un bloque por sección; Gaming va
 * destacado sobre fondo oscuro.
 */
export default async function HomePage() {
  const [{ lead, secondary, latest, sections }, rates] = await Promise.all([getHomepage(), getDollarRates()]);

  // El sitio y su buscador se describen aunque todavía no haya notas.
  const siteLd = <JsonLd data={websiteJsonLd(env.SITE_URL, env.SITE_NAME)} />;

  if (!lead) {
    return (
      <div className="mx-auto grid max-w-site gap-8 px-4 py-10 md:px-8 lg:grid-cols-12 lg:py-16">
        {siteLd}
        <section className="lg:col-span-8">
          <p className="kicker">Portada</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
            Todavía no hay noticias publicadas
          </h1>
          <p className="mt-4 max-w-measure font-body text-md text-ink-muted">
            Cuando se publique la primera nota desde el panel de administración, va a aparecer acá.
          </p>
        </section>
        <div className="lg:col-span-4">
          <DollarPanel initial={rates} />
        </div>
      </div>
    );
  }

  const timeline = [lead, ...secondary, ...latest]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 6);

  return (
    <div className="mx-auto grid max-w-site gap-12 px-4 py-6 md:px-8 md:py-8">
      {siteLd}
      <h1 className="sr-only">{env.SITE_NAME}: portada</h1>

      <section aria-label="Principales" className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <ArticleCard article={lead} variant="lead" headingLevel="h2" priority />
        </div>
        <div className="grid content-start gap-6 md:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <DollarPanel initial={rates} />
          <LatestTimeline articles={timeline} />
        </div>
        {secondary.length > 0 ? (
          <ul className="grid gap-6 md:grid-cols-3 lg:col-span-12">
            {secondary.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} variant="secondary" headingLevel="h2" />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {latest.length > 0 ? (
        <section aria-labelledby="ultimas" className="grid gap-6">
          <SectionHeader id="ultimas" title="Últimas noticias" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} variant="secondary" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.map(({ category, articles }) => {
        const featured = isFeaturedSection(category.slug);
        return (
          <section
            key={category.slug}
            aria-labelledby={`seccion-${category.slug}`}
            style={sectionTone(category.slug)}
            className={featured ? "grid gap-6 rounded-card bg-night p-5 shadow-raised md:p-8" : "grid gap-6"}
          >
            <SectionHeader
              id={`seccion-${category.slug}`}
              title={category.name}
              href={`/categoria/${category.slug}`}
              inverse={featured}
            />
            <ul className="grid gap-6 md:grid-cols-3">
              {articles.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} variant="list" showCategory={false} inverse={featured} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
