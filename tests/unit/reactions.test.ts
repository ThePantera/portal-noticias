import { describe, expect, it } from "vitest";
import {
  QUICK_REACTIONS,
  REACTION_GROUPS,
  normalizeEmoji,
  sortReactions,
  toggleLocally,
} from "@/lib/reactions";

describe("emojis de reacción", () => {
  it("acepta un solo emoji, incluidas banderas, tonos de piel y secuencias", () => {
    for (const emoji of ["🔥", "👍🏽", "🇦🇷", "👩‍💻", "🏳️‍🌈", "1️⃣", "🦀"]) {
      expect(normalizeEmoji(emoji)).toBe(emoji);
    }
    expect(normalizeEmoji("  🚀 ")).toBe("🚀");
  });

  it("completa el selector de variación cuando falta", () => {
    expect(normalizeEmoji("❤")).toBe("❤️");
  });

  it("rechaza texto, varios emojis y valores que no son texto", () => {
    for (const value of ["", "hola", "a", "1", "🔥🔥", "🔥 hola", "<script>", null, 3, {}]) {
      expect(normalizeEmoji(value)).toBeNull();
    }
  });

  it("todos los emojis ofrecidos son válidos y ya están en forma canónica", () => {
    const all = [...QUICK_REACTIONS, ...REACTION_GROUPS.flatMap((g) => g.emojis)];
    for (const emoji of all) expect(normalizeEmoji(emoji)).toBe(emoji);
  });
});

describe("conteo de reacciones", () => {
  it("ordena por cantidad y, a igual cantidad, por la que llegó antes", () => {
    const at = (minute: number) => new Date(Date.UTC(2026, 9, 7, 0, minute));
    expect(
      sortReactions([
        { emoji: "🐛", count: 2, firstAt: at(5) },
        { emoji: "🔥", count: 5, firstAt: at(9) },
        { emoji: "🚀", count: 2, firstAt: at(1) },
      ]),
    ).toEqual([
      { emoji: "🔥", count: 5 },
      { emoji: "🚀", count: 2 },
      { emoji: "🐛", count: 2 },
    ]);
  });

  it("un toque suma o resta al instante, y el cero desaparece", () => {
    const start = { reactions: [{ emoji: "🔥", count: 1 }], mine: [] };
    const added = toggleLocally(start, "🔥");
    expect(added).toEqual({ reactions: [{ emoji: "🔥", count: 2 }], mine: ["🔥"] });
    const fresh = toggleLocally(added, "🦀");
    expect(fresh.reactions).toContainEqual({ emoji: "🦀", count: 1 });
    expect(toggleLocally(fresh, "🦀")).toEqual(added);
    expect(toggleLocally({ reactions: [{ emoji: "🔥", count: 1 }], mine: ["🔥"] }, "🔥")).toEqual({
      reactions: [],
      mine: [],
    });
  });
});
