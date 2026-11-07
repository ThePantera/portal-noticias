import { ArticleCard } from "@/components/editorial/ArticleCard";
import { BreakingBar } from "@/components/editorial/BreakingBar";
import { CardRail } from "@/components/editorial/CardRail";
import { DollarPanel } from "@/components/editorial/DollarPanel";
import { JsonLd } from "@/components/editorial/JsonLd";
import { LatestTimeline } from "@/components/editorial/LatestTimeline";
import { MostRead } from "@/components/editorial/MostRead";
import { SectionHeader } from "@/components/editorial/SectionHeader";
import { TopicsBar } from "@/components/editorial/TopicsBar";
import { WeatherPanel } from "@/components/editorial/WeatherPanel";
import { isFeaturedSection, sectionTone } from "@/lib/sections";
import { websiteJsonLd } from "@/lib/seo";
import { env } from "@/server/env";
import { getDollarRates } from "@/server/services/exchange-rates";
import { getHomepage, getMostRead, getTrendingTopics } from "@/server/services/public-content";
import { getWeather } from "@/server/services/weather";

/*
 * Ancho de las tarjetas del carril destacado: en el celular una entera y la punta de la
 * siguiente, para que se note que se desliza; en la computadora, cuatro a lo ancho.
 */
const WIDE_ITEM = "w-[80%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-4.5rem)/4)]";

/** Secundarias que conservan la foto grande en el celular; las demás pasan a fila compacta. */
const BIG_SECONDARY = 2;

/** Fila compacta (por debajo de 1024 px): filete arriba en lugar del espacio entre tarjetas. */
const ROW_ITEM = "min-w-0 border-t border-rule py-3 lg:border-0 lg:py-0";

/**
 * Portada de diario, por jerarquía: arriba la cinta de "Último momento"; después la nota
 * principal grande y, debajo, las secundarias (el orden lo fija "Destacada" en el panel). Al
 * costado, el dólar en vivo y el minuto a minuto; debajo, las últimas. Después, cada sección
 * como en el papel: una nota con foto y hasta tres titulares debajo, en columnas (tres por
 * fila en la computadora). Los bloques aparecen con un leve movimiento al bajar.
 *
 * En el celular y la tableta (menos de 1024 px) sólo la principal y las dos siguientes
 * llevan foto grande; el resto va en filas compactas con foto chica, y el minuto a minuto
 * (que repite las mismas notas) se oculta. "Lo más leído" va en la columna lateral.
 */
export default async function HomePage() {
  const [{ lead, secondary, latest, sections }, rates, topics, weather, mostRead] = await Promise.all([
    getHomepage(),
    getDollarRates(),
    getTrendingTopics(),
    getWeather(),
    getMostRead(),
  ]);

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
        <div className="grid content-start gap-6 lg:col-span-4">
          <DollarPanel initial={rates} />
          <WeatherPanel weather={weather} />
        </div>
      </div>
    );
  }

  const timeline = [lead, ...secondary, ...latest]
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 5);
  const breaking = timeline.slice(0, 3);
  const regular = sections.filter(({ category }) => !isFeaturedSection(category.slug));
  const featured = sections.filter(({ category }) => isFeaturedSection(category.slug));

  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-10 px-4 py-6 md:gap-12 md:px-8 md:py-8">
      {siteLd}
      <h1 className="sr-only">{env.SITE_NAME}: portada</h1>
      <BreakingBar articles={breaking} />
      <TopicsBar topics={topics} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8 lg:gap-y-10">
        <section aria-labelledby="principales" className="grid min-w-0 grid-cols-1 gap-6 lg:col-span-8">
          <h2 id="principales" className="sr-only">
            Principales
          </h2>
          <ArticleCard article={lead} variant="lead" headingLevel="h3" priority />
          {secondary.length > 0 ? (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {secondary.map((article, index) =>
                index < BIG_SECONDARY ? (
                  <li key={article.id} className="min-w-0">
                    <ArticleCard article={article} variant="list" mobileLayout="noExcerpt" />
                  </li>
                ) : (
                  <li key={article.id} className={ROW_ITEM}>
                    <ArticleCard article={article} variant="list" mobileLayout="row" />
                  </li>
                ),
              )}
            </ul>
          ) : null}
        </section>
        <div className="grid content-start gap-6 md:grid-cols-2 lg:col-span-4 lg:row-span-2 lg:grid-cols-1">
          <DollarPanel initial={rates} />
          <WeatherPanel weather={weather} />
          <LatestTimeline articles={timeline} className="max-lg:hidden" />
          <MostRead articles={mostRead.slice(0, 5)} />
        </div>
        {latest.length > 0 ? (
          <section
            aria-labelledby="ultimas"
            className="reveal grid min-w-0 grid-cols-1 content-start gap-3 lg:col-span-8"
          >
            <SectionHeader id="ultimas" title="Últimas noticias" />
            {/* En el celular van cuatro: las demás suelen repetirse en las secciones de abajo. */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-6">
              {latest.slice(0, 6).map((article, index) => (
                <li key={article.id} className={index < 4 ? ROW_ITEM : `${ROW_ITEM} max-sm:hidden`}>
                  <ArticleCard article={article} variant="secondary" mobileLayout="row" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {regular.length > 0 ? (
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3">
          {regular.map(({ category, articles }) => (
            <section
              key={category.slug}
              aria-labelledby={`seccion-${category.slug}`}
              style={sectionTone(category.slug)}
              className="reveal grid min-w-0 grid-cols-1 content-start gap-3"
            >
              <SectionHeader
                id={`seccion-${category.slug}`}
                title={category.name}
                href={`/categoria/${category.slug}`}
              />
              <ArticleCard
                article={articles[0]}
                variant="secondary"
                showCategory={false}
                mobileLayout="row"
              />
              {articles.length > 1 ? (
                <ul className="grid divide-y divide-rule border-t border-rule">
                  {articles.slice(1, 4).map((article) => (
                    <li key={article.id} className="py-3">
                      <ArticleCard
                        article={article}
                        variant="compact"
                        showCategory={false}
                        mobileLayout="row"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}

      {featured.map(({ category, articles }) => (
        <section
          key={category.slug}
          aria-labelledby={`seccion-${category.slug}`}
          style={sectionTone(category.slug)}
          className="reveal grid grid-cols-1 gap-3 rounded-card bg-night p-5 shadow-raised md:p-8"
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
