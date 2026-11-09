import { describe, expect, it } from "vitest";
import { findYoutubeInHtml, hasOwnVideo, youtubeId } from "@/lib/video";

describe("youtubeId", () => {
  it("reconoce los formatos de link de YouTube", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=10",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/live/dQw4w9WgXcQ",
    ]) {
      expect(youtubeId(url)).toBe("dQw4w9WgXcQ");
    }
  });

  it("devuelve null para otros sitios o ids inválidos", () => {
    expect(youtubeId("https://www.infobae.com/video/nota")).toBeNull();
    expect(youtubeId("https://www.youtube.com/@infobae")).toBeNull();
    expect(youtubeId("https://www.youtube.com/watch?v=corto")).toBeNull();
    expect(youtubeId("no es un link")).toBeNull();
  });
});

describe("findYoutubeInHtml y hasOwnVideo", () => {
  it("encuentra el video en un iframe o un link, no un canal", () => {
    expect(findYoutubeInHtml('<a href="https://www.youtube.com/@canal">c</a>')).toBeNull();
    expect(findYoutubeInHtml('<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>')).toBe(
      "dQw4w9WgXcQ",
    );
    expect(findYoutubeInHtml('<a href="https://www.youtube.com/watch?list=x&amp;v=dQw4w9WgXcQ">v</a>')).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("detecta videos propios del medio", () => {
    expect(hasOwnVideo('<meta property="og:video:url" content="https://x/v.mp4">')).toBe(true);
    expect(hasOwnVideo('<video src="/v.mp4"></video>')).toBe(true);
    expect(hasOwnVideo('{"@type": "VideoObject"}')).toBe(true);
    expect(hasOwnVideo("<p>sin video</p>")).toBe(false);
  });
});
