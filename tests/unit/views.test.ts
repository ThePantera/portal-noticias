import { describe, expect, it } from "vitest";
import { buenosAiresDay, isArticleId, isLikelyBot } from "@/lib/views";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

describe("medición de lecturas", () => {
  it("cuenta los días con la hora de Buenos Aires", () => {
    expect(buenosAiresDay(new Date("2026-11-07T02:30:00Z"))).toBe("2026-11-06");
    expect(buenosAiresDay(new Date("2026-11-07T03:00:00Z"))).toBe("2026-11-07");
  });

  it("no cuenta buscadores, vistas previas ni pedidos sin navegador", () => {
    expect(isLikelyBot(null)).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelyBot("WhatsApp/2.23.20.0")).toBe(true);
    expect(isLikelyBot("curl/8.5.0")).toBe(true);
    expect(isLikelyBot(IPHONE)).toBe(false);
  });

  it("sólo acepta identificadores de nota con forma de cuid", () => {
    expect(isArticleId("cmhn3k2a90000abcd1234efgh")).toBe(true);
    expect(isArticleId("'; DROP TABLE articles; --")).toBe(false);
    expect(isArticleId(42)).toBe(false);
  });
});
