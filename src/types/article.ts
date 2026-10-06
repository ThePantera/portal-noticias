/**
 * Tipos de dominio compartidos entre servidor y componentes.
 * No salen del cliente de Prisma: `src/lib` y `src/components` no pueden importar
 * código de servidor (ADR 0002). `src/server/services/articles.ts` verifica en
 * tiempo de compilación que estas uniones coincidan con los enums del esquema.
 */
export const ARTICLE_STATUSES = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_ORIGINS = ["MANUAL", "IMPORTED", "AI_ASSISTED"] as const;
export type ArticleOrigin = (typeof ARTICLE_ORIGINS)[number];

export const ROLES = ["ADMIN", "EDITOR", "AUTHOR", "CONTRIBUTOR"] as const;
export type Role = (typeof ROLES)[number];
