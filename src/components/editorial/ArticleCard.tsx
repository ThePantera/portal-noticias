import Link from "next/link";
import { sectionTone } from "@/lib/sections";
import type { ArticleCardData } from "@/types/public";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";

type Variant = "lead" | "secondary" | "list" | "compact";

const titleClass: Record<Variant, string> = {
  lead: "text-2xl leading-tight md:text-3xl lg:text-4xl",
  secondary: "text-lg leading-snug",
  list: "text-lg leading-snug md:text-xl",
  compact: "text-base leading-snug",
};

/** Ancho aproximado con que se muestra la foto de cada variante, para elegir del srcset. */
const imageSizes: Record<Variant, string> = {
  lead: "(min-width: 1440px) 860px, (min-width: 1024px) 64vw, 100vw",
  secondary: "(min-width: 1440px) 420px, (min-width: 1024px) 30vw, (min-width: 768px) 33vw, 100vw",
  list: "(min-width: 1440px) 420px, (min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw",
  compact: "112px",
};

type ArticleCardProps = {
  article: ArticleCardData;
  variant?: Variant;
  showCategory?: boolean;
  headingLevel?: "h2" | "h3";
  /** La foto se pide primero: sólo para la nota principal de la página. */
  priority?: boolean;
  /** Sobre fondo oscuro (bloque Gaming): la tarjeta toma colores claros. */
  inverse?: boolean;
};

/**
 * Tarjeta de nota con radio y sombra suave. El título es el único enlace a la nota y se
 * estira sobre toda la tarjeta (`after:inset-0`), así se puede tocar en cualquier parte sin
 * anidar enlaces; la sección queda encima, con su propio enlace. El color de la volanta
 * sale de la sección (ver src/lib/sections.ts).
 */
export function ArticleCard({
  article,
  variant = "list",
  showCategory = true,
  headingLevel = "h3",
  priority = false,
  inverse = false,
}: ArticleCardProps) {
  const Heading = headingLevel;
  const href = `/noticias/${article.slug}`;
  const category = showCategory ? (
    <Link href={`/categoria/${article.category.slug}`} className="relative z-10 section-pill hover:underline">
      {article.category.name}
    </Link>
  ) : null;
  const title = (className: string) => (
    <Heading className={`font-display font-bold tracking-tight ${titleClass[variant]} ${className}`}>
      <Link href={href} className="after:absolute after:inset-0">
        {article.title}
      </Link>
    </Heading>
  );

  // Principal con foto: el título va sobre la imagen, con un degradé para que se lea.
  if (variant === "lead" && article.image) {
    return (
      <article
        style={sectionTone(article.category.slug)}
        className="group relative isolate overflow-hidden rounded-card bg-night shadow-raised"
      >
        <ArticleImage
          image={article.image}
          sizes={imageSizes.lead}
          priority={priority}
          aspect="aspect-[4/5] sm:aspect-[16/10]"
          className="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-night via-night/60 to-transparent"
        />
        <div className="lead-caption absolute inset-x-0 bottom-0 p-5 md:p-8">
          {showCategory ? (
            <Link
              href={`/categoria/${article.category.slug}`}
              className="relative z-10 inline-flex rounded-full bg-on-night px-2.5 py-1 text-xs font-bold tracking-wide text-night uppercase hover:underline"
            >
              {article.category.name}
            </Link>
          ) : null}
          {title("mt-3 text-on-night")}
          {article.excerpt ? (
            <p className="mt-3 hidden max-w-2xl text-base text-on-night-muted sm:block md:text-lg">
              {article.excerpt}
            </p>
          ) : null}
          <ArticleMeta
            tone="inverse"
            className="mt-4"
            authorName={article.authorName}
            publishedAt={article.publishedAt}
            readingTimeMinutes={article.readingTimeMinutes}
          />
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article
        style={sectionTone(article.category.slug)}
        className="group relative flex min-w-0 items-start gap-4"
      >
        <div className="min-w-0 flex-1">
          {category}
          {title(`mt-1.5 ${inverse ? "text-on-night" : "text-ink group-hover:text-accent"}`)}
          <ArticleMeta
            tone={inverse ? "inverse" : "default"}
            className="mt-2"
            publishedAt={article.publishedAt}
          />
        </div>
        {article.image ? (
          <div className="w-20 shrink-0 overflow-hidden rounded-xl md:w-24">
            <ArticleImage image={article.image} sizes={imageSizes.compact} aspect="aspect-square" />
          </div>
        ) : null}
      </article>
    );
  }

  const showExcerpt = (variant === "list" || variant === "lead") && article.excerpt;
  return (
    <article
      style={sectionTone(article.category.slug)}
      className={`group relative flex h-full min-w-0 flex-col overflow-hidden rounded-card border transition duration-300 hover:-translate-y-1 ${
        inverse
          ? "border-on-night/10 bg-night-raised"
          : "border-rule bg-surface shadow-card hover:shadow-raised"
      }`}
    >
      {article.image ? (
        <div className="overflow-hidden">
          <ArticleImage
            image={article.image}
            sizes={imageSizes[variant]}
            priority={priority}
            aspect="aspect-[16/9]"
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div aria-hidden="true" className="h-1.5 bg-section" />
      )}
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <div>{category}</div>
        {title(`mt-2 ${inverse ? "text-on-night" : "text-ink group-hover:text-accent"}`)}
        {showExcerpt ? (
          <p
            className={`mt-2 line-clamp-3 font-body text-base ${inverse ? "text-on-night-muted" : "text-ink-muted"}`}
          >
            {article.excerpt}
          </p>
        ) : null}
        <ArticleMeta
          tone={inverse ? "inverse" : "default"}
          className="mt-auto pt-4"
          authorName={variant === "lead" ? article.authorName : undefined}
          publishedAt={article.publishedAt}
          readingTimeMinutes={
            variant === "list" || variant === "lead" ? article.readingTimeMinutes : undefined
          }
        />
      </div>
    </article>
  );
}
