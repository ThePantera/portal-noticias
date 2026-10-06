import Link from "next/link";
import type { ArticleCardData } from "@/types/public";
import { ArticleImage } from "./ArticleImage";
import { ArticleMeta } from "./ArticleMeta";

type Variant = "lead" | "secondary" | "list" | "compact";

const titleClass: Record<Variant, string> = {
  lead: "text-2xl leading-tight md:text-3xl lg:text-4xl",
  secondary: "text-xl leading-snug md:text-lg lg:text-xl",
  list: "text-lg md:text-xl leading-snug",
  compact: "text-lg leading-snug",
};

/** Ancho aproximado con que se muestra la foto de cada variante, para elegir del srcset. */
const imageSizes: Record<Exclude<Variant, "compact">, string> = {
  lead: "(min-width: 1440px) 900px, (min-width: 1024px) 64vw, 100vw",
  secondary: "(min-width: 1440px) 400px, (min-width: 1024px) 28vw, (min-width: 768px) 33vw, 100vw",
  list: "(min-width: 1440px) 420px, (min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw",
};

type ArticleCardProps = {
  article: ArticleCardData;
  variant?: Variant;
  showCategory?: boolean;
  headingLevel?: "h2" | "h3";
  /** La foto se pide primero: sólo para la nota principal de la página. */
  priority?: boolean;
};

/**
 * Tarjeta editorial sin caja: foto, volanta, título, bajada y firma. Todo el título es el
 * enlace, así el área para tocar es grande en mobile sin anidar enlaces. La foto también
 * lleva a la nota, pero queda fuera del orden de tabulación para no repetir el enlace.
 * La variante compacta no lleva foto.
 */
export function ArticleCard({
  article,
  variant = "list",
  showCategory = true,
  headingLevel = "h3",
  priority = false,
}: ArticleCardProps) {
  const Heading = headingLevel;
  const showExcerpt = variant !== "compact";

  return (
    <article className="min-w-0">
      {article.image && variant !== "compact" ? (
        <Link
          href={`/noticias/${article.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className={`block ${variant === "lead" ? "mb-4" : "mb-3"}`}
        >
          <ArticleImage image={article.image} sizes={imageSizes[variant]} priority={priority} />
        </Link>
      ) : null}
      {showCategory ? (
        <Link href={`/categoria/${article.category.slug}`} className="kicker hover:underline">
          {article.category.name}
        </Link>
      ) : null}
      <Heading className={`mt-1.5 font-display font-semibold text-ink ${titleClass[variant]}`}>
        <Link href={`/noticias/${article.slug}`} className="hover:text-accent">
          {article.title}
        </Link>
      </Heading>
      {showExcerpt && article.excerpt ? (
        <p
          className={`mt-2 font-body text-ink-muted ${variant === "lead" ? "text-md md:text-xl md:leading-snug" : "text-base"}`}
        >
          {article.excerpt}
        </p>
      ) : null}
      <ArticleMeta
        className="mt-3"
        authorName={variant === "lead" ? article.authorName : undefined}
        publishedAt={article.publishedAt}
        readingTimeMinutes={variant === "list" || variant === "lead" ? article.readingTimeMinutes : undefined}
      />
    </article>
  );
}
