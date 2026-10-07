import { describe, expect, it } from "vitest";
import { isFeaturedSection, sectionTone } from "@/lib/sections";

describe("color por sección", () => {
  it("cada sección conocida tiene su color y una nueva usa el acento", () => {
    expect(sectionTone("gaming")).toEqual({ "--section": "var(--color-hue-violet)" });
    expect(sectionTone("mundo")).toEqual({ "--section": "var(--color-hue-blue)" });
    expect(sectionTone("ciberseguridad")).toEqual({ "--section": "var(--color-hue-rose)" });
    expect(sectionTone("seccion-nueva")).toEqual({});
  });

  it("sólo Gaming va como bloque destacado", () => {
    expect(isFeaturedSection("gaming")).toBe(true);
    expect(isFeaturedSection("mundo")).toBe(false);
  });
});
