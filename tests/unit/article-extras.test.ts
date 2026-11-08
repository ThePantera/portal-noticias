import { describe, expect, it } from "vitest";
import {
  LIVE_UPDATE_MAX_LENGTH,
  checkGalleryText,
  checkLiveUpdate,
  liveUpdateParagraphs,
} from "@/lib/article-extras";

describe("actualizaciones en vivo", () => {
  it("limpia espacios y líneas en blanco de más", () => {
    expect(checkLiveUpdate("  Gol de Boca.  \r\n\r\n\r\n\r\n  Lo hizo Cavani. ")).toEqual({
      ok: true,
      value: "Gol de Boca.\n\nLo hizo Cavani.",
    });
  });

  it("rechaza vacías y demasiado largas", () => {
    expect(checkLiveUpdate("   \n ").ok).toBe(false);
    expect(checkLiveUpdate("a".repeat(LIVE_UPDATE_MAX_LENGTH + 1)).ok).toBe(false);
    expect(checkLiveUpdate("a".repeat(LIVE_UPDATE_MAX_LENGTH)).ok).toBe(true);
  });

  it("separa los párrafos", () => {
    expect(liveUpdateParagraphs("Uno.\n\nDos.\nSigue dos.")).toEqual(["Uno.", "Dos.\nSigue dos."]);
  });
});

describe("textos de la galería", () => {
  it("la descripción es obligatoria; el epígrafe no", () => {
    expect(checkGalleryText("  ", true).ok).toBe(false);
    expect(checkGalleryText("  ", false)).toEqual({ ok: true, value: "" });
    expect(checkGalleryText("  El Papa   en  Luján ", true)).toEqual({
      ok: true,
      value: "El Papa en Luján",
    });
  });
});
