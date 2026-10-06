import { describe, expect, it } from "vitest";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/server/auth/password";

describe("contraseñas", () => {
  it("guarda un hash argon2id, nunca el texto", async () => {
    const hash = await hashPassword("una contraseña larga");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("una contraseña larga");
  });

  it("verifica la correcta y rechaza la incorrecta", async () => {
    const hash = await hashPassword("una contraseña larga");
    expect(await verifyPassword(hash, "una contraseña larga")).toBe(true);
    expect(await verifyPassword(hash, "otra contraseña")).toBe(false);
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", async () => {
    expect(await hashPassword("igual igual igual")).not.toBe(await hashPassword("igual igual igual"));
  });

  it("no lanza con un hash inválido y siempre falla contra el dummy", async () => {
    expect(await verifyPassword("!demo-sin-acceso", "x")).toBe(false);
    expect(await verifyAgainstDummy("cualquiera")).toBe(false);
  });
});
