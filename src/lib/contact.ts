/** Validación del formulario de contacto, compartida por el formulario y la API. */

export const CONTACT_LIMITS = { name: 80, email: 120, message: 3000, minMessage: 10 } as const;

/** Mensajes por conexión en una hora: frena el spam sin molestar a quien escribe de verdad. */
export const CONTACT_MAX_PER_HOUR = 5;

export type ContactInput = { name: string; email: string; message: string };

export type ContactValidation = { ok: true; data: ContactInput } | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(body: unknown, key: string): string {
  if (!body || typeof body !== "object" || !(key in body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export function validateContact(body: unknown): ContactValidation {
  const name = field(body, "name");
  const email = field(body, "email");
  const message = field(body, "message");
  if (!name || name.length > CONTACT_LIMITS.name) return { ok: false, error: "Escribí tu nombre." };
  if (email.length > CONTACT_LIMITS.email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Revisá el correo: así no le podemos responder." };
  }
  if (message.length < CONTACT_LIMITS.minMessage) return { ok: false, error: "El mensaje es muy corto." };
  if (message.length > CONTACT_LIMITS.message) {
    return { ok: false, error: `El mensaje puede tener hasta ${CONTACT_LIMITS.message} caracteres.` };
  }
  return { ok: true, data: { name, email, message } };
}
