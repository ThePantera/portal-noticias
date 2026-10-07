"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type CardRailProps = {
  /** Nombre del carril para lectores de pantalla, por ejemplo "Notas de Economía". */
  label: string;
  /** Sobre fondo oscuro (bloque Gaming). */
  inverse?: boolean;
  /** Los `<li>` con las tarjetas; cada uno fija su propio ancho. */
  children: ReactNode;
};

/**
 * Carril horizontal de tarjetas: en el celular se desliza con el dedo y en la computadora
 * tiene flechas a los costados. Muestra muchas notas en una sola fila, así la portada no
 * se hace eterna. Las flechas se apagan en los extremos.
 */
export function CardRail({ label, inverse = false, children }: CardRailProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () =>
      setEdges({
        start: list.scrollLeft <= 4,
        end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4,
      });
    list.addEventListener("scroll", update, { passive: true });
    // El observador también avisa apenas empieza: ahí se calculan las flechas por primera vez.
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const move = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * list.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  const button = `absolute top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border shadow-raised transition-opacity disabled:pointer-events-none disabled:opacity-0 md:grid ${
    inverse
      ? "border-on-night/15 bg-night-raised text-on-night hover:bg-night"
      : "border-rule bg-surface text-ink hover:text-accent"
  }`;

  return (
    <div className="relative">
      <ul
        ref={listRef}
        aria-label={label}
        className="-mx-1 no-scrollbar flex snap-x snap-mandatory scroll-px-1 gap-4 overflow-x-auto overscroll-x-contain px-1 py-3 sm:gap-6"
      >
        {children}
      </ul>
      <button
        type="button"
        aria-label="Ver notas anteriores"
        disabled={edges.start}
        onClick={() => move(-1)}
        className={`${button} left-2`}
      >
        <Chevron d="M15 6l-6 6 6 6" />
      </button>
      <button
        type="button"
        aria-label="Ver más notas"
        disabled={edges.end}
        onClick={() => move(1)}
        className={`${button} right-2`}
      >
        <Chevron d="M9 6l6 6-6 6" />
      </button>
    </div>
  );
}

function Chevron({ d }: { d: string }) {
  return (
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
      <path d={d} />
    </svg>
  );
}
