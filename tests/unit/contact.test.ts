import { describe, expect, it } from "vitest";
import { CONTACT_LIMITS, validateContact } from "@/lib/contact";

describe("formulario de contacto", () => {
  const valid = { name: "Ana", email: "ana@example.com", message: "Hay un error en la nota del dólar." };

  it("acepta un mensaje completo y recorta espacios", () => {
    expect(validateContact({ ...valid, name: "  Ana  " })).toEqual({ ok: true, data: valid });
  });

  it("rechaza datos faltantes o inválidos", () => {
    expect(validateContact(null).ok).toBe(false);
    expect(validateContact({ ...valid, name: "" }).ok).toBe(false);
    expect(validateContact({ ...valid, email: "ana" }).ok).toBe(false);
    expect(validateContact({ ...valid, message: "hola" }).ok).toBe(false);
    expect(validateContact({ ...valid, message: "a".repeat(CONTACT_LIMITS.message + 1) }).ok).toBe(false);
    expect(validateContact({ ...valid, email: 123 }).ok).toBe(false);
  });
});
