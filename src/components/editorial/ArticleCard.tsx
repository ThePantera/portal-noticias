import Link from "next/link";
import { sectionTone } from "@/lib/sections";
import type { ArticleCardData } from "@/types/public";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";

type Variant = "lead" | "secondary" | "list" | "compact";

const titleClass: Record<Variant, string> = {
  lead: "text-2xl leading-tight md:text-3xl",
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
  /** Sobre fondo oscuro: la tarjeta toma colores claros. */
  inverse?: boolean;
};

/**
 * Tarjeta de nota al estilo diario: foto con radio y texto abajo, sin caja. El título es el único enlace a la nota y se
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

  if (variant === "compact") {
    return (
      <article
        style={sectionTone(article.category.slug)}
        className="group relative flex min-w-0 items-start gap-4"
      >
        <div className="min-w-0 flex-1">
          {category}
          {title(`mt-1.5 ${inverse ? "text-on-night" : "text-ink decoration-1 underline-offset-4 group-hover:underline"}`)}
          <ArticleMeta
            tone={inverse ? "inverse" : "default"}
            className="mt-2"
            publishedAt={article.publishedAt}
          />
        </div>
        {article.image ? (
          <div className="w-20 shrink-0 overflow-hidden rounded-card md:w-24">
            <ArticleImage image={article.image} sizes={imageSizes.compact} aspect="aspect-square" />
          </div>
        ) : null}
      </article>
    );
  }

  // La principal es la misma tarjeta en grande: foto arriba, título en serif y bajada abajo.
  const showExcerpt = (variant === "list" || variant === "lead") && article.excerpt;
  return (
    <article
      style={sectionTone(article.category.slug)}
      className="group relative flex h-full min-w-0 flex-col"
    >
      {article.image ? (
        <div className="overflow-hidden rounded-card">
          <ArticleImage
            image={article.image}
            sizes={imageSizes[variant]}
            priority={priority}
            aspect="aspect-[16/9]"
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div aria-hidden="true" className="h-1 rounded-full bg-section" />
      )}
      <div className={`flex flex-1 flex-col ${variant === "lead" ? "pt-4" : "pt-3"}`}>
        <div>{category}</div>
        {title(`mt-2 ${inverse ? "text-on-night" : "text-ink decoration-1 underline-offset-4 group-hover:underline"}`)}
        {showExcerpt ? (
          <p
            className={`mt-2 line-clamp-3 font-body text-base ${inverse ? "text-on-night-muted" : "text-ink-muted"}`}
          >
            {article.excerpt}
          </p>
        ) : null}
        <ArticleMeta
          tone={inverse ? "inverse" : "default"}
          className="mt-auto pt-3"
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
