import { describe, expect, it } from "vitest";
import { embedUrl, parseYouTubeId, streamStatusFromWatchPage } from "@/lib/live-cams";

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
    const url = embedUrl("teXukOT_AuA");
    expect(url.startsWith("https://www.youtube-nocookie.com/embed/teXukOT_AuA?")).toBe(true);
    expect(url).toContain("mute=1");
  });
});

describe("estado de la transmisión", () => {
  it("distingue en vivo, caída y desconocido", () => {
    expect(streamStatusFromWatchPage('..."liveBroadcastDetails":{"isLiveNow":true,...')).toBe("live");
    const ended = '"playabilityStatus":{"status":"OK"},"isLiveNow":false';
    expect(streamStatusFromWatchPage(ended)).toBe("down");
    expect(streamStatusFromWatchPage('"playabilityStatus":{"status":"ERROR"')).toBe("down");
    // YouTube pide iniciar sesión a los servidores: no sirve para decidir.
    expect(streamStatusFromWatchPage('"playabilityStatus":{"status":"LOGIN_REQUIRED"')).toBe("unknown");
    expect(streamStatusFromWatchPage('"playabilityStatus":{"status":"OK"}')).toBe("unknown");
    expect(streamStatusFromWatchPage("<html></html>")).toBe("unknown");
  });
});
