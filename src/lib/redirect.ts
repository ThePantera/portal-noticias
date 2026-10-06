/**
 * Destino seguro después del login: sólo rutas internas del panel.
 * Evita redirecciones abiertas como "//sitio-malicioso.com" o "https://…".
 */
export function safeAdminPath(next: unknown, fallback = "/admin"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/admin")) return fallback;
  if (next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  if (next.startsWith("/admin/login")) return fallback;
  const rest = next.slice("/admin".length);
  if (rest !== "" && !rest.startsWith("/") && !rest.startsWith("?")) return fallback;
  return next;
}
