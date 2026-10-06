import type { Role } from "@/generated/prisma/client";

/**
 * Tabla de permisos por rol (ADR 0004). En el MVP sólo existe ADMIN; los demás roles
 * quedan definidos para sumar redactores sin reescribir el panel.
 */
export type Action =
  | "dashboard:view"
  | "article:create"
  | "article:edit"
  | "article:edit-any"
  | "article:publish"
  | "article:delete"
  | "taxonomy:manage"
  | "media:upload"
  | "user:manage";

const ALL: readonly Action[] = [
  "dashboard:view",
  "article:create",
  "article:edit",
  "article:edit-any",
  "article:publish",
  "article:delete",
  "taxonomy:manage",
  "media:upload",
  "user:manage",
];

const PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  ADMIN: new Set(ALL),
  EDITOR: new Set(ALL.filter((a) => a !== "user:manage")),
  // Autores: escriben y editan lo propio, pero no publican.
  AUTHOR: new Set(["dashboard:view", "article:create", "article:edit", "media:upload"]),
  // Colaboradores: sólo proponen borradores.
  CONTRIBUTOR: new Set(["dashboard:view", "article:create", "article:edit"]),
};

export type Actor = { id: string; role: Role };

/**
 * ¿Puede `actor` hacer `action`? Para `article:edit`, si se pasa `ownerId`, quien no tenga
 * `article:edit-any` sólo puede editar sus propias notas.
 */
export function can(actor: Actor | null, action: Action, resource?: { ownerId: string }): boolean {
  if (!actor) return false;
  const granted = PERMISSIONS[actor.role];
  if (!granted.has(action)) return false;
  if (action === "article:edit" && resource && !granted.has("article:edit-any")) {
    return resource.ownerId === actor.id;
  }
  return true;
}
