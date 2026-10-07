import { ArticleCard } from "@/components/editorial/ArticleCard";
import { CardRail } from "@/components/editorial/CardRail";
import { DollarPanel } from "@/components/editorial/DollarPanel";
import { HeroCarousel } from "@/components/editorial/HeroCarousel";
import { JsonLd } from "@/components/editorial/JsonLd";
import { LatestTimeline } from "@/components/editorial/LatestTimeline";
import { SectionHeader } from "@/components/editorial/SectionHeader";
import { isFeaturedSection, sectionTone } from "@/lib/sections";
import { websiteJsonLd } from "@/lib/seo";
import { env } from "@/server/env";
import { getDollarRates } from "@/server/services/exchange-rates";
import { getHomepage } from "@/server/services/public-content";

/*
 * Ancho de las tarjetas en los carriles: en el celular una entera y la punta de la siguiente,
 * para que se note que se desliza. En la computadora, cuatro a lo ancho de la página, tres
 * debajo del carrusel y dos en las secciones, que van de a dos por fila.
 */
const WIDE_ITEM = "w-[80%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-4.5rem)/4)]";
const LATEST_ITEM = "w-[80%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]";
const HALF_ITEM = "w-[80%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)]";

/**
 * Portada en forma de panel: el carrusel de destacadas que pasa solo y, al costado, el dólar
 * en vivo y el minuto a minuto; debajo del carrusel, las últimas. Después, cada sección en un
 * carril horizontal (de a dos por fila en la computadora), así la página no se hace eterna;
 * Gaming cierra destacado sobre fondo oscuro. Los bloques aparecen con un leve movimiento al bajar.
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
    .slice(0, 5);
  const regular = sections.filter(({ category }) => !isFeaturedSection(category.slug));
  const featured = sections.filter(({ category }) => isFeaturedSection(category.slug));

  return (
    <div className="mx-auto grid max-w-site gap-10 px-4 py-6 md:gap-12 md:px-8 md:py-8">
      {siteLd}
      <h1 className="sr-only">{env.SITE_NAME}: portada</h1>

      <div className="grid gap-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-10">
        <div className="min-w-0 lg:col-span-8">
          <HeroCarousel articles={[lead, ...secondary]} />
        </div>
        <div className="grid content-start gap-6 md:grid-cols-2 lg:col-span-4 lg:row-span-2 lg:grid-cols-1">
          <DollarPanel initial={rates} />
          <LatestTimeline articles={timeline} />
        </div>
        {latest.length > 0 ? (
          <section
            aria-labelledby="ultimas"
            className="reveal grid min-w-0 content-start gap-3 lg:col-span-8"
          >
            <SectionHeader id="ultimas" title="Últimas noticias" />
            <CardRail label="Últimas noticias">
              {latest.map((article) => (
                <li key={article.id} className={LATEST_ITEM}>
                  <ArticleCard article={article} variant="secondary" />
                </li>
              ))}
            </CardRail>
          </section>
        ) : null}
      </div>

      {regular.length > 0 ? (
        <div className="grid gap-10 md:gap-12 lg:grid-cols-2 lg:gap-x-8">
          {regular.map(({ category, articles }) => (
            <section
              key={category.slug}
              aria-labelledby={`seccion-${category.slug}`}
              style={sectionTone(category.slug)}
              className="reveal grid min-w-0 content-start gap-3"
            >
              <SectionHeader
                id={`seccion-${category.slug}`}
                title={category.name}
                href={`/categoria/${category.slug}`}
              />
              <CardRail label={`Notas de ${category.name}`}>
                {articles.map((article) => (
                  <li key={article.id} className={HALF_ITEM}>
                    <ArticleCard article={article} variant="secondary" showCategory={false} />
                  </li>
                ))}
              </CardRail>
            </section>
          ))}
        </div>
      ) : null}

      {featured.map(({ category, articles }) => (
        <section
          key={category.slug}
          aria-labelledby={`seccion-${category.slug}`}
          style={sectionTone(category.slug)}
          className="reveal grid gap-3 rounded-card bg-night p-5 shadow-raised md:p-8"
        >
          <SectionHeader
            id={`seccion-${category.slug}`}
            title={category.name}
            href={`/categoria/${category.slug}`}
            inverse
          />
          <CardRail label={`Notas de ${category.name}`} inverse>
            {articles.map((article) => (
              <li key={article.id} className={WIDE_ITEM}>
                <ArticleCard article={article} variant="secondary" showCategory={false} inverse />
              </li>
            ))}
          </CardRail>
        </section>
      ))}
    </div>
  );
}
