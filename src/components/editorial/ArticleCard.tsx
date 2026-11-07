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
  compact: "96px",
};

/** En fila compacta (celular y tableta) la foto mide 96 px; desde 1024 px vuelve a ser la de la tarjeta. */
const rowImageSizes = "(min-width: 1440px) 420px, (min-width: 1024px) 30vw, 96px";

/** Títulos de la fila compacta: chicos por debajo de 1024 px, los de siempre en la computadora. */
const rowTitleClass: Partial<Record<Variant, string>> = {
  secondary: "text-base leading-snug lg:text-lg",
  list: "text-base leading-snug lg:text-xl",
};

/**
 * Cómo se ve la tarjeta en pantallas chicas (en la computadora no cambia):
 * - "row": por debajo de 1024 px, fila compacta con foto chica al costado, sin bajada ni firma.
 * - "noExcerpt": por debajo de 640 px, foto grande pero sin bajada.
 */
type MobileLayout = "row" | "noExcerpt";

type ArticleCardProps = {
  article: ArticleCardData;
  variant?: Variant;
  showCategory?: boolean;
  headingLevel?: "h2" | "h3";
  /** La foto se pide primero: sólo para la nota principal de la página. */
  priority?: boolean;
  /** Sobre fondo oscuro: la tarjeta toma colores claros. */
  inverse?: boolean;
  /** Cómo se ve en pantallas chicas; sin valor, igual que en la computadora. */
  mobileLayout?: MobileLayout;
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
  mobileLayout,
}: ArticleCardProps) {
  const Heading = headingLevel;
  const row = mobileLayout === "row";
  const href = `/noticias/${article.slug}`;
  const category = showCategory ? (
    <Link href={`/categoria/${article.category.slug}`} className="relative z-10 section-pill hover:underline">
      {article.category.name}
    </Link>
  ) : null;
  const titleSize = (row && rowTitleClass[variant]) || titleClass[variant];
  const titleTone = inverse
    ? "text-on-night"
    : "text-ink decoration-1 underline-offset-4 group-hover:underline";
  const title = (className: string) => (
    <Heading className={`font-display font-bold tracking-tight ${titleSize} ${className}`}>
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
          {title(`mt-1.5 ${titleTone}`)}
          <ArticleMeta
            tone={inverse ? "inverse" : "default"}
            className={row ? "mt-2 max-lg:hidden" : "mt-2"}
            publishedAt={article.publishedAt}
          />
        </div>
        {article.image ? (
          <div className="w-24 shrink-0 overflow-hidden rounded-card">
            <ArticleImage image={article.image} sizes={imageSizes.compact} aspect="aspect-square" />
          </div>
        ) : null}
      </article>
    );
  }

  // La principal es la misma tarjeta en grande: foto arriba, título en serif y bajada abajo.
  // En fila compacta la foto queda a la derecha del texto (por eso row-reverse) hasta 1024 px.
  const showExcerpt = (variant === "list" || variant === "lead") && article.excerpt;
  const excerptTone = inverse ? "text-on-night-muted" : "text-ink-muted";
  const excerptHidden = row ? "max-lg:hidden" : mobileLayout === "noExcerpt" ? "max-sm:hidden" : "";
  const direction = row
    ? "flex-row-reverse items-start gap-4 lg:flex-col lg:items-stretch lg:gap-0"
    : "flex-col";
  return (
    <article
      style={sectionTone(article.category.slug)}
      className={`group relative flex h-full min-w-0 ${direction}`}
    >
      {article.image ? (
        <div className={`overflow-hidden rounded-card ${row ? "w-24 shrink-0 lg:w-auto" : ""}`}>
          <ArticleImage
            image={article.image}
            sizes={row ? rowImageSizes : imageSizes[variant]}
            priority={priority}
            aspect={row ? "aspect-[4/3] lg:aspect-[16/9]" : "aspect-[16/9]"}
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div aria-hidden="true" className={`h-1 rounded-full bg-section ${row ? "hidden lg:block" : ""}`} />
      )}
      <div
        className={`flex min-w-0 flex-1 flex-col ${row ? "lg:pt-3" : variant === "lead" ? "pt-4" : "pt-3"}`}
      >
        <div>{category}</div>
        {title(`${row ? "mt-1 lg:mt-2" : "mt-2"} ${titleTone}`)}
        {showExcerpt ? (
          <p className={`mt-2 line-clamp-3 font-body text-base ${excerptTone} ${excerptHidden}`}>
            {article.excerpt}
          </p>
        ) : null}
        <ArticleMeta
          tone={inverse ? "inverse" : "default"}
          className={row ? "mt-auto pt-3 max-lg:hidden" : "mt-auto pt-3"}
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
