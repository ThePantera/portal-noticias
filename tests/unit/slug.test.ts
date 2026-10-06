import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("convierte el ejemplo del requisito", () => {
    expect(slugify("Argentina anuncia nuevas medidas económicas")).toBe(
      "argentina-anuncia-nuevas-medidas-economicas",
    );
  });

  it("quita acentos, eñes y signos", () => {
    expect(slugify("¿Qué pasó con el Niño? ¡Año récord!")).toBe("que-paso-con-el-nino-ano-record");
  });

  it("colapsa espacios y guiones repetidos y recorta los extremos", () => {
    expect(slugify("  Apple   presenta -- nuevo iPhone  ")).toBe("apple-presenta-nuevo-iphone");
  });

  it("devuelve vacío si no queda nada usable", () => {
    expect(slugify("¿¡!?")).toBe("");
  });

  it("no supera 80 caracteres ni corta una palabra", () => {
    const slug = slugify(
      "El Congreso aprueba en una sesión extraordinaria la reforma integral del sistema previsional y de salud",
    );
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe("el-congreso-aprueba-en-una-sesion-extraordinaria-la-reforma-integral-del");
  });
});

describe("uniqueSlug", () => {
  const takenIn = (taken: string[]) => async (s: string) => taken.includes(s);

  it("usa el slug base si está libre", async () => {
    expect(await uniqueSlug("nueva-ley", takenIn([]))).toBe("nueva-ley");
  });

  it("agrega -2, -3… si ya existe", async () => {
    expect(await uniqueSlug("nueva-ley", takenIn(["nueva-ley"]))).toBe("nueva-ley-2");
    expect(await uniqueSlug("nueva-ley", takenIn(["nueva-ley", "nueva-ley-2"]))).toBe("nueva-ley-3");
  });

  it("usa 'nota' cuando el título no deja slug", async () => {
    expect(await uniqueSlug("", takenIn([]))).toBe("nota");
  });

  it("mantiene el límite de 80 caracteres con sufijo", async () => {
    const base = "a".repeat(80);
    const result = await uniqueSlug(base, takenIn([base]));
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith("-2")).toBe(true);
  });
});
