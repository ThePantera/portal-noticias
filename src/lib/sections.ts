import type { CSSProperties } from "react";

/**
 * Color de cada sección. Las tarjetas y los bloques de la portada lo toman de la variable
 * --section (utilidades `kicker`, `section-pill`, `text-section`, `bg-section`). Una sección
 * nueva sin color asignado usa el acento del portal.
 */
const HUES: Record<string, string> = {
  politica: "--color-hue-rose",
  economia: "--color-hue-green",
  tecnologia: "--color-hue-teal",
  mundo: "--color-hue-blue",
  sociedad: "--color-hue-orange",
  seguridad: "--color-hue-rose",
  deportes: "--color-hue-green",
  cultura: "--color-hue-violet",
  ciencia: "--color-hue-teal",
  tendencias: "--color-hue-orange",
  gaming: "--color-hue-violet",
  ia: "--color-hue-blue",
  programacion: "--color-hue-green",
  ciberseguridad: "--color-hue-rose",
  hardware: "--color-hue-orange",
  "trabajo-it": "--color-hue-teal",
};

/** Estilo en línea que fija el color de la sección para todo lo que está adentro. */
export function sectionTone(slug: string): CSSProperties {
  const hue = HUES[slug];
  return (hue ? { "--section": `var(${hue})` } : {}) as CSSProperties;
}

/** Secciones que la portada muestra como bloque destacado, sobre fondo oscuro. */
export function isFeaturedSection(slug: string): boolean {
  return slug === "gaming";
}
