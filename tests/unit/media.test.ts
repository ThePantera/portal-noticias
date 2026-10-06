import { describe, expect, it } from "vitest";
import { buildSrcSet, detectImageFormat, pickVariant, variantWidths } from "@/lib/media";
import type { MediaVariant } from "@/types/media";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((v) => (typeof v === "string" ? Array.from(v, (c) => c.charCodeAt(0)) : [v])),
  );

describe("detectImageFormat", () => {
  it("reconoce el formato por los bytes, no por el nombre", () => {
    expect(detectImageFormat(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(detectImageFormat(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    expect(detectImageFormat(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("webp");
    expect(detectImageFormat(bytes(0, 0, 0, 0x1c, "ftypavif"))).toBe("avif");
  });

  it("rechaza SVG, HTML, GIF y HEIC", () => {
    expect(detectImageFormat(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectImageFormat(bytes("<!doctype html>"))).toBeNull();
    expect(detectImageFormat(bytes("GIF89a"))).toBeNull();
    expect(detectImageFormat(bytes(0, 0, 0, 0x18, "ftypheic"))).toBeNull();
    expect(detectImageFormat(new Uint8Array())).toBeNull();
  });
});

describe("variantes", () => {
  it("no agranda: los anchos estándar que entran, más el propio", () => {
    expect(variantWidths(4000)).toEqual([480, 960, 1600, 2400]);
    expect(variantWidths(1200)).toEqual([480, 960, 1200]);
    expect(variantWidths(960)).toEqual([480, 960]);
    expect(variantWidths(400)).toEqual([400]);
  });

  const variants: MediaVariant[] = [
    { key: "media/a/w960.webp", width: 960, height: 640, format: "webp", sizeBytes: 1 },
    { key: "media/a/og.jpg", width: 1200, height: 630, format: "jpeg", sizeBytes: 1, purpose: "og" },
    { key: "media/a/w480.webp", width: 480, height: 320, format: "webp", sizeBytes: 1 },
  ];

  it("arma el srcset ordenado y sin el recorte para redes", () => {
    expect(buildSrcSet(variants, (k) => `/x/${k}`)).toBe(
      "/x/media/a/w480.webp 480w, /x/media/a/w960.webp 960w",
    );
  });

  it("elige la variante más chica que alcance el ancho pedido", () => {
    expect(pickVariant(variants, 500)?.width).toBe(960);
    expect(pickVariant(variants, 2000)?.width).toBe(960);
    expect(pickVariant([], 500)).toBeUndefined();
  });
});
