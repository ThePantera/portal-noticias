import { describe, expect, it } from "vitest";
import { safeAdminPath } from "@/lib/redirect";

describe("safeAdminPath", () => {
  it("acepta rutas del panel", () => {
    expect(safeAdminPath("/admin")).toBe("/admin");
    expect(safeAdminPath("/admin/notas/nueva")).toBe("/admin/notas/nueva");
    expect(safeAdminPath("/admin?estado=borrador")).toBe("/admin?estado=borrador");
  });

  it.each([
    ["https://malicioso.com"],
    ["//malicioso.com"],
    ["/admin.malicioso.com"],
    ["/adminx"],
    ["/\\malicioso.com"],
    ["/admin/login"],
    ["/noticias/algo"],
    [""],
    [undefined],
    [["/admin"]],
  ])("rechaza %j", (value) => {
    expect(safeAdminPath(value)).toBe("/admin");
  });
});
