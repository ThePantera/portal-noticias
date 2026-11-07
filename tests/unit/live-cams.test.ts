import { describe, expect, it } from "vitest";
import { embedUrl, parseYouTubeId } from "@/lib/live-cams";

describe("cámaras en vivo", () => {
  it("saca el identificador de cualquier enlace de YouTube", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=teXukOT_AuA",
      "https://m.youtube.com/watch?v=teXukOT_AuA&t=10",
      "https://youtu.be/teXukOT_AuA?si=abc",
      "https://www.youtube.com/live/teXukOT_AuA?feature=share",
      "https://www.youtube-nocookie.com/embed/teXukOT_AuA",
      "  teXukOT_AuA  ",
    ]) {
      expect(parseYouTubeId(link)).toBe("teXukOT_AuA");
    }
  });

  it("rechaza lo que no es un video de YouTube", () => {
    expect(parseYouTubeId("https://vimeo.com/123456")).toBeNull();
    expect(parseYouTubeId("https://www.youtube.com/@canal")).toBeNull();
    expect(parseYouTubeId("hola")).toBeNull();
    expect(parseYouTubeId("https://evil.com/watch?v=teXukOT_AuA")).toBeNull();
  });

  it("inserta el reproductor sin cookies y en silencio", () => {
    expect(embedUrl("teXukOT_AuA")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/teXukOT_AuA\?mute=1/);
  });
});
