import type { PublicImage } from "@/types/media";

type Props = {
  image: PublicImage;
  /** Ancho con que se muestra, para que el navegador elija la variante justa. */
  sizes: string;
  /** La imagen principal de la página: se pide antes y sin carga diferida (mejora el LCP). */
  priority?: boolean;
  className?: string;
  /** Proporción del recorte, como clase de Tailwind. */
  aspect?: string;
};

/**
 * Imagen editorial con sus propias variantes (srcset). No usa next/image porque las
 * variantes ya se generan al subir: así no se paga la optimización de Vercel por imagen.
 */
export function ArticleImage({
  image,
  sizes,
  priority = false,
  className = "",
  aspect = "aspect-[3/2]",
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes propias con srcset
    <img
      src={image.src}
      srcSet={image.srcSet || undefined}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={`${aspect} w-full bg-rule/40 object-cover${className ? ` ${className}` : ""}`}
    />
  );
}

/** Imagen con epígrafe y crédito, para el cuerpo de la nota. */
export function ArticleFigure({ image, sizes, priority, className = "" }: Props) {
  const hasCaption = Boolean(image.caption || image.credit);
  return (
    <figure className={className}>
      <ArticleImage
        image={image}
        sizes={sizes}
        priority={priority}
        aspect="aspect-auto"
        className="rounded-card"
      />
      {hasCaption ? (
        <figcaption className="mt-2 text-sm text-ink-subtle">
          {image.caption}
          {image.caption && image.credit ? " " : null}
          {image.credit ? <span className="text-ink-muted">{image.credit}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
