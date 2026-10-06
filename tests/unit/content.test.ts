import { describe, expect, it } from "vitest";
import { EMPTY_DOC, extractPlainText, readingTimeMinutes, type EditorDoc } from "@/lib/content";

const doc: EditorDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Qué cambia" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "El plazo baja a " },
        { type: "text", text: "30 días", marks: [{ type: "bold" }] },
        { type: "text", text: "." },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Uno" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Dos" }] }] },
      ],
    },
    { type: "horizontalRule" },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Fin" }, { type: "hardBreak" }, { type: "text", text: "de nota" }],
    },
  ],
};

describe("extractPlainText", () => {
  it("une el texto respetando bloques y marcas", () => {
    expect(extractPlainText(doc)).toBe("Qué cambia\nEl plazo baja a 30 días.\nUno\nDos\nFin\nde nota");
  });

  it("devuelve vacío para un documento vacío", () => {
    expect(extractPlainText(EMPTY_DOC)).toBe("");
  });
});

describe("readingTimeMinutes", () => {
  it("tiene un mínimo de 1 minuto", () => {
    expect(readingTimeMinutes("")).toBe(1);
    expect(readingTimeMinutes("pocas palabras")).toBe(1);
  });

  it("redondea hacia arriba a 220 palabras por minuto", () => {
    expect(readingTimeMinutes(Array(220).fill("p").join(" "))).toBe(1);
    expect(readingTimeMinutes(Array(221).fill("p").join(" "))).toBe(2);
    expect(readingTimeMinutes(Array(1000).fill("p").join(" "))).toBe(5);
  });
});
