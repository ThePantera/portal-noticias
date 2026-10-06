import { describe, expect, it } from "vitest";
import { bearerMatches } from "@/server/auth/bearer";

describe("cabecera Bearer", () => {
  const secret = "una-llave-larga-de-prueba-0123456789";

  it("acepta sólo la llave exacta", () => {
    expect(bearerMatches(`Bearer ${secret}`, secret)).toBe(true);
    expect(bearerMatches(`Bearer ${secret}x`, secret)).toBe(false);
    expect(bearerMatches(`Bearer `, secret)).toBe(false);
  });

  it("rechaza cabeceras ausentes o con otro esquema", () => {
    expect(bearerMatches(null, secret)).toBe(false);
    expect(bearerMatches(secret, secret)).toBe(false);
    expect(bearerMatches(`Basic ${secret}`, secret)).toBe(false);
  });
});
