import { describe, expect, it } from "vitest";
import { can, type Action } from "@/server/permissions";

const admin = { id: "a", role: "ADMIN" as const };
const editor = { id: "e", role: "EDITOR" as const };
const author = { id: "w", role: "AUTHOR" as const };
const contributor = { id: "c", role: "CONTRIBUTOR" as const };

describe("can", () => {
  it("niega todo sin usuario", () => {
    expect(can(null, "dashboard:view")).toBe(false);
  });

  it("el admin puede todo", () => {
    const actions: Action[] = ["article:publish", "article:delete", "user:manage", "taxonomy:manage"];
    for (const action of actions) expect(can(admin, action)).toBe(true);
    expect(can(admin, "article:edit", { ownerId: "otro" })).toBe(true);
  });

  it("el editor no administra usuarios", () => {
    expect(can(editor, "article:publish")).toBe(true);
    expect(can(editor, "user:manage")).toBe(false);
  });

  it("el autor edita sólo lo propio y no publica", () => {
    expect(can(author, "article:edit", { ownerId: "w" })).toBe(true);
    expect(can(author, "article:edit", { ownerId: "otro" })).toBe(false);
    expect(can(author, "article:publish")).toBe(false);
    expect(can(author, "article:delete")).toBe(false);
  });

  it("el colaborador no sube imágenes ni publica", () => {
    expect(can(contributor, "article:create")).toBe(true);
    expect(can(contributor, "media:upload")).toBe(false);
    expect(can(contributor, "article:publish")).toBe(false);
  });
});
