import { describe, expect, it } from "vitest";
import { ARTICLE_STATUS, STATUS_ORDER } from "@/lib/article-status";
import { ARTICLE_STATUSES } from "@/types/article";

describe("estados de nota", () => {
  it("cada estado tiene nombre y explicación en español", () => {
    for (const status of ARTICLE_STATUSES) {
      expect(ARTICLE_STATUS[status].label).toBeTruthy();
      expect(ARTICLE_STATUS[status].description).toBeTruthy();
    }
  });

  it("el orden del tablero incluye todos los estados sin repetir", () => {
    expect([...STATUS_ORDER].sort()).toEqual([...ARTICLE_STATUSES].sort());
  });

  it("empieza por las publicadas", () => {
    expect(STATUS_ORDER[0]).toBe("PUBLISHED");
  });
});
