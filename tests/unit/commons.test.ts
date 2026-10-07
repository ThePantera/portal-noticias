import { describe, expect, it } from "vitest";
import { buildCredit, isAllowedLicense, parseCommonsResponse, plainText } from "@/lib/commons";

function page(index: number, overrides: Record<string, unknown> = {}, meta: Record<string, string> = {}) {
  return {
    index,
    title: `File:Foto ${index}.jpg`,
    imageinfo: [
      {
        thumburl: `https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Foto_${index}.jpg/1600px-Foto_${index}.jpg`,
        thumbwidth: 1600,
        thumbheight: 1067,
        descriptionurl: `https://commons.wikimedia.org/wiki/File:Foto_${index}.jpg`,
        mime: "image/jpeg",
        extmetadata: {
          LicenseShortName: { value: meta.license ?? "CC BY-SA 4.0" },
          LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" },
          Artist: {
            value: meta.artist ?? '<a href="//commons.wikimedia.org/wiki/User:Ana">Ana P&amp;rez</a>',
          },
          ImageDescription: { value: "<p>El Obelisco de noche</p>" },
        },
        ...overrides,
      },
    ],
  };
}

describe("licencias de Commons", () => {
  it.each(["CC0", "Public domain", "CC BY 2.0", "CC BY-SA 4.0", "CC BY-SA 3.0 ar", "cc-by-sa-4.0"])(
    "acepta %s",
    (name) => expect(isAllowedLicense(name)).toBe(true),
  );
  it.each(["CC BY-NC 2.0", "CC BY-NC-SA 4.0", "CC BY-ND 4.0", "Fair use", "GFDL", "All rights reserved"])(
    "rechaza %s",
    (name) => expect(isAllowedLicense(name)).toBe(false),
  );
});

describe("respuesta de Commons", () => {
  it("devuelve sólo fotos usables, en el orden de la búsqueda, con el crédito armado", () => {
    const json = {
      query: {
        pages: [
          page(3),
          page(1),
          page(2, {}, { license: "CC BY-NC 2.0" }),
          page(4, { mime: "image/svg+xml" }),
          page(5, { thumburl: "https://ejemplo.com/foto.jpg" }),
        ],
      },
    };
    const photos = parseCommonsResponse(json);
    expect(photos.map((p) => p.title)).toEqual(["File:Foto 1.jpg", "File:Foto 3.jpg"]);
    expect(photos[0]).toMatchObject({
      author: "Ana P&rez",
      license: "CC BY-SA 4.0",
      description: "El Obelisco de noche",
      credit: "Ana P&rez / Wikimedia Commons, CC BY-SA 4.0",
    });
  });

  it("tolera respuestas vacías o con otro formato", () => {
    expect(parseCommonsResponse(null)).toEqual([]);
    expect(parseCommonsResponse({ batchcomplete: true })).toEqual([]);
  });

  it("acorta el autor para que el crédito entre en 120 caracteres", () => {
    const credit = buildCredit("Un nombre larguísimo ".repeat(10), "CC BY-SA 4.0");
    expect(credit.length).toBeLessThanOrEqual(120);
    expect(credit.endsWith(" / Wikimedia Commons, CC BY-SA 4.0")).toBe(true);
    expect(plainText("<b>Hola</b>&nbsp;mundo")).toBe("Hola mundo");
  });
});
