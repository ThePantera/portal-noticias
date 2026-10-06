import type { ArticleStatus } from "@/types/article";

/**
 * Cambios de estado de una nota (ver docs/00-auditoria-y-propuesta.md, sección 11).
 * La tabla es la única fuente de verdad: el servicio la usa para validar en el backend y
 * el editor para decidir qué botones mostrar.
 */
export type ArticleTransition = "publish" | "schedule" | "unpublish" | "archive" | "delete";

const ALLOWED_FROM: Record<ArticleTransition, readonly ArticleStatus[]> = {
  publish: ["DRAFT", "SCHEDULED", "ARCHIVED"],
  // Desde SCHEDULED es reprogramar.
  schedule: ["DRAFT", "SCHEDULED"],
  // Vuelve a borrador: despublicar, cancelar la programación o restaurar una archivada.
  unpublish: ["PUBLISHED", "SCHEDULED", "ARCHIVED"],
  archive: ["DRAFT", "SCHEDULED", "PUBLISHED"],
  // Una nota publicada o programada se archiva o se pasa a borrador antes de eliminarla,
  // para que borrar algo visible nunca sea un solo clic.
  delete: ["DRAFT", "ARCHIVED"],
};

export function canTransition(transition: ArticleTransition, from: ArticleStatus): boolean {
  return ALLOWED_FROM[transition].includes(from);
}

export function allowedFrom(transition: ArticleTransition): readonly ArticleStatus[] {
  return ALLOWED_FROM[transition];
}

/** Nombre del botón según el estado actual, para que diga lo que va a pasar. */
export function unpublishLabel(from: ArticleStatus): string {
  if (from === "SCHEDULED") return "Cancelar programación";
  if (from === "ARCHIVED") return "Restaurar como borrador";
  return "Despublicar";
}
