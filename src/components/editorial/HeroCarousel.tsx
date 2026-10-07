"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { sectionTone } from "@/lib/sections";
import type { ArticleCardData } from "@/types/public";
import { ArticleCard } from "./ArticleCard";

/** Segundos que se queda cada nota antes de pasar a la siguiente (ver `hero-progress` en globals.css). */
const SLIDE_SECONDS = 7;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Carrusel de destacadas de la portada. Pasa solo cada siete segundos y se detiene mientras
 * el lector lo señala con el mouse, tiene el foco adentro, cambia de pestaña o aprieta
 * "Pausar". En el celular se desliza con el dedo (scroll-snap). El avance lo marca la barra
 * de progreso: cuando termina su animación, pasa a la siguiente; con "reducir movimiento"
 * no hay animaciones, así que tampoco pasa solo.
 */
export function HeroCarousel({ articles }: { articles: ArticleCardData[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const count = articles.length;

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const next = (index + count) % count;
      track.scrollTo({
        left: next * track.clientWidth,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [count],
  );

  // La nota activa sigue al desplazamiento: sirve igual para el dedo, las flechas y el avance solo.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const index = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      setActive(Math.min(Math.max(index, 0), count - 1));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [count]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (count === 0) return null;
  const running = count > 1 && !paused && !hovered && !focused && !hidden;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Noticias destacadas"
      className="grid gap-3"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="relative">
        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-card"
        >
          {articles.map((article, i) => (
            <div
              key={article.id}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${count}`}
              data-active={i === active}
              className="hero-slide w-full shrink-0 snap-start"
            >
              <ArticleCard article={article} variant="lead" headingLevel="h2" priority={i === 0} />
            </div>
          ))}
        </div>

        {count > 1 ? (
          <div className="absolute top-3 right-3 flex gap-2 md:top-5 md:right-5">
            <CarouselButton label="Nota anterior" onClick={() => goTo(active - 1)}>
              <path d="M15 6l-6 6 6 6" />
            </CarouselButton>
            <CarouselButton
              label={paused ? "Reanudar el carrusel" : "Pausar el carrusel"}
              onClick={() => setPaused((value) => !value)}
              className="motion-reduce:hidden"
            >
              {paused ? <path d="M8 5v14l11-7z" /> : <path d="M9 5v14M15 5v14" />}
            </CarouselButton>
            <CarouselButton label="Nota siguiente" onClick={() => goTo(active + 1)}>
              <path d="M9 6l6 6-6 6" />
            </CarouselButton>
          </div>
        ) : null}
      </div>

      {count > 1 ? (
        <ol
          className="grid gap-2 md:gap-3"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {articles.map((article, i) => (
            <li key={article.id} style={sectionTone(article.category.slug)}>
              <button
                type="button"
                aria-current={i === active ? "true" : undefined}
                aria-label={`Ver nota ${i + 1}: ${article.title}`}
                onClick={() => goTo(i)}
                className="group grid w-full gap-2 py-2 text-left md:py-0"
              >
                <span
                  className={`block h-1 overflow-hidden rounded-full ${i === active ? "bg-section/25" : "bg-rule"}`}
                >
                  {i === active ? (
                    <span
                      key={active}
                      className="hero-progress block h-full origin-left bg-section"
                      style={{
                        animationDuration: `${SLIDE_SECONDS}s`,
                        animationPlayState: running ? "running" : "paused",
                      }}
                      onAnimationEnd={() => goTo(active + 1)}
                    />
                  ) : null}
                </span>
                <span
                  aria-hidden="true"
                  className={`hidden text-sm leading-snug font-semibold transition-colors md:line-clamp-2 ${
                    i === active ? "text-ink" : "text-ink-subtle group-hover:text-ink"
                  }`}
                >
                  {article.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function CarouselButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid size-9 place-items-center rounded-full bg-night/60 text-on-night backdrop-blur transition-colors hover:bg-night/85 md:size-10 ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
