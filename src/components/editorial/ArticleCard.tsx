import Link from "next/link";
import type { ArticleCardData } from "@/types/public";
import { ArticleMeta } from "./ArticleMeta";

type Variant = "lead" | "secondary" | "list" | "compact";

const titleClass: Record<Variant, string> = {
  lead: "text-2xl leading-tight md:text-3xl lg:text-4xl",
  secondary: "text-xl leading-snug md:text-lg lg:text-xl",
  list: "text-lg md:text-xl leading-snug",
  compact: "text-lg leading-snug",
};

type ArticleCardProps = {
  article: ArticleCardData;
  variant?: Variant;
  showCategory?: boolean;
  headingLevel?: "h2" | "h3";
};

/**
 * Tarjeta editorial sin caja: volanta, título, bajada y firma. Todo el título es el
 * enlace, así el área para tocar es grande en mobile sin anidar enlaces.
 */
export function ArticleCard({
  article,
  variant = "list",
  showCategory = true,
  headingLevel = "h3",
}: ArticleCardProps) {
  const Heading = headingLevel;
  const showExcerpt = variant !== "compact";

  return (
    <article className="min-w-0">
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
