"use client";

import { useRef, useState } from "react";
import type { PublicImage } from "@/types/media";

type Props = { images: PublicImage[]; className?: string };

/**
 * Galería de fotos de la nota: se desliza con el dedo o con las flechas, una foto por vez,
 * con su epígrafe y crédito, y un contador ("3 de 8").
 */
export function ArticleGallery({ images, className = "" }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  if (images.length === 0) return null;

  function go(index: number) {
    const list = listRef.current;
    const target = Math.max(0, Math.min(images.length - 1, index));
    list?.children[target]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  function onScroll() {
    const list = listRef.current;
    if (list && list.clientWidth > 0) setCurrent(Math.round(list.scrollLeft / list.clientWidth));
  }

  const arrow =
    "grid size-10 place-items-center rounded-full border border-rule bg-surface text-lg text-ink hover:border-ink disabled:opacity-40";

  return (
    <section aria-labelledby="galeria" aria-roledescription="carrusel" className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="galeria" className="font-ui text-sm font-bold tracking-wide uppercase">
          Galería de fotos
        </h2>
        <span className="font-ui text-sm text-ink-subtle" aria-live="polite">
          {current + 1} de {images.length}
        </span>
      </div>
      <ul
        ref={listRef}
        onScroll={onScroll}
        className="mt-3 flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none]"
      >
        {images.map((image, index) => (
          <li
            key={image.src}
            className="w-full shrink-0 snap-start"
            aria-roledescription="foto"
            aria-label={`${index + 1} de ${images.length}`}
          >
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element -- variantes propias con srcset */}
              <img
                src={image.src}
                srcSet={image.srcSet || undefined}
                sizes="(min-width: 768px) 40rem, 100vw"
                width={image.width}
                height={image.height}
                alt={image.alt}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className="aspect-[3/2] w-full rounded-card bg-rule/40 object-contain"
              />
              {image.caption || image.credit ? (
                <figcaption className="mt-2 text-sm text-ink-subtle">
                  {image.caption}
                  {image.caption && image.credit ? " " : null}
                  {image.credit ? <span className="text-ink-muted">{image.credit}</span> : null}
                </figcaption>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
      {images.length > 1 ? (
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            className={arrow}
            onClick={() => go(current - 1)}
            disabled={current === 0}
            aria-label="Foto anterior"
          >
            ←
          </button>
          <button
            type="button"
            className={arrow}
            onClick={() => go(current + 1)}
            disabled={current >= images.length - 1}
            aria-label="Foto siguiente"
          >
            →
          </button>
        </div>
      ) : null}
    </section>
  );
}
