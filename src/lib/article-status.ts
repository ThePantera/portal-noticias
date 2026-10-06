import type { ArticleStatus } from "@/types/article";

type StatusInfo = { label: string; plural: string; description: string; colorClass: string };

/** Nombre y color de cada estado. Única fuente para el panel. */
export const ARTICLE_STATUS: Record<ArticleStatus, StatusInfo> = {
  DRAFT: {
    label: "Borrador",
    plural: "Borradores",
    description: "Sin publicar. Sólo vos la ves.",
    colorClass: "text-ink-subtle",
  },
  SCHEDULED: {
    label: "Programada",
    plural: "Programadas",
    description: "Se publica sola en la fecha indicada.",
    colorClass: "text-warning",
  },
  PUBLISHED: {
    label: "Publicada",
    plural: "Publicadas",
    description: "Visible en el portal.",
    colorClass: "text-success",
  },
  ARCHIVED: {
    label: "Archivada",
    plural: "Archivadas",
    description: "Fuera del portal, pero guardada.",
    colorClass: "text-ink-muted",
  },
};

export const STATUS_ORDER = [
  "PUBLISHED",
  "DRAFT",
  "SCHEDULED",
  "ARCHIVED",
] as const satisfies readonly ArticleStatus[];
