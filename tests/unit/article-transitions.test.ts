import { describe, expect, it } from "vitest";
import { canTransition, unpublishLabel } from "@/lib/article-transitions";

describe("transiciones de estado", () => {
  it("publicar desde borrador, programada o archivada, nunca otra vez desde publicada", () => {
    expect(canTransition("publish", "DRAFT")).toBe(true);
    expect(canTransition("publish", "SCHEDULED")).toBe(true);
    expect(canTransition("publish", "ARCHIVED")).toBe(true);
    expect(canTransition("publish", "PUBLISHED")).toBe(false);
  });

  it("sólo se programa un borrador o se reprograma una programada", () => {
    expect(canTransition("schedule", "DRAFT")).toBe(true);
    expect(canTransition("schedule", "SCHEDULED")).toBe(true);
    expect(canTransition("schedule", "PUBLISHED")).toBe(false);
    expect(canTransition("schedule", "ARCHIVED")).toBe(false);
  });

  it("una nota visible o programada no se elimina de un clic", () => {
    expect(canTransition("delete", "PUBLISHED")).toBe(false);
    expect(canTransition("delete", "SCHEDULED")).toBe(false);
    expect(canTransition("delete", "DRAFT")).toBe(true);
    expect(canTransition("delete", "ARCHIVED")).toBe(true);
  });

  it("el botón de volver a borrador dice lo que hace", () => {
    expect(unpublishLabel("PUBLISHED")).toBe("Despublicar");
    expect(unpublishLabel("SCHEDULED")).toBe("Cancelar programación");
    expect(unpublishLabel("ARCHIVED")).toBe("Restaurar como borrador");
  });
});
