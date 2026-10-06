import { describe, expect, it } from "vitest";
import { pageParam, textParam } from "@/lib/search-params";

describe("parámetros de la URL", () => {
  it("toma el primer valor como texto", () => {
    expect(textParam("dólar")).toBe("dólar");
    expect(textParam(["a", "b"])).toBe("a");
    expect(textParam(undefined)).toBe("");
  });

  it("la página es un entero positivo y acotado", () => {
    expect(pageParam("3")).toBe(3);
    expect(pageParam(undefined)).toBe(1);
    for (const bad of ["0", "-2", "abc", "", "1e9999"]) expect(pageParam(bad)).toBe(1);
    expect(pageParam("99999999")).toBe(10_000);
  });
});
