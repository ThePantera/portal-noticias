import { describe, expect, it } from "vitest";
import { EMPTY_DOC, extractPlainText, readingTimeMinutes, sanitizeDoc, type EditorDoc } from "@/lib/content";

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

describe("sanitizeDoc", () => {
  const p = (...content: unknown[]) => ({ type: "paragraph", content });
  const t = (text: string, marks?: unknown[]) => ({ type: "text", text, ...(marks ? { marks } : {}) });

  it("deja pasar el contenido editorial permitido tal cual", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [t("Contexto")] },
        p(t("Texto "), t("fuerte", [{ type: "bold" }]), { type: "hardBreak" }, t("y más")),
        { type: "bulletList", content: [{ type: "listItem", content: [p(t("uno"))] }] },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [{ type: "listItem", content: [p(t("tres"))] }],
        },
        { type: "blockquote", content: [p(t("cita"))] },
        { type: "horizontalRule" },
      ],
    };
    expect(sanitizeDoc(doc)).toEqual(doc);
  });

  it("quita enlaces javascript: y data: pero conserva el texto", () => {
    for (const href of [
      "javascript:alert(1)",
      " JaVaScRiPt:alert(1)",
      "data:text/html,<script>",
      "vbscript:x",
      "/relativo",
    ]) {
      const clean = sanitizeDoc({
        type: "doc",
        content: [p(t("clic", [{ type: "link", attrs: { href } }]))],
      });
      expect(clean.content?.[0].content?.[0]).toEqual({ type: "text", text: "clic" });
    }
  });

  it("conserva enlaces seguros y descarta atributos extra como onclick o target", () => {
    const clean = sanitizeDoc({
      type: "doc",
      content: [
        p(
          t("ver", [
            { type: "link", attrs: { href: "https://example.com/a?b=1", onclick: "x()", target: "_self" } },
          ]),
        ),
      ],
    });
    expect(clean.content?.[0].content?.[0].marks).toEqual([
      { type: "link", attrs: { href: "https://example.com/a?b=1" } },
    ]);
  });

  it("descarta nodos y marcas desconocidos (html crudo, iframes, imágenes sin subir)", () => {
    const clean = sanitizeDoc({
      type: "doc",
      content: [
        { type: "html", content: [t("<script>")] },
        { type: "iframe", attrs: { src: "https://evil" } },
        p(t("hola", [{ type: "fontColor", attrs: { color: "red" } }, { type: "italic" }])),
      ],
    });
    expect(clean).toEqual({ type: "doc", content: [p(t("hola", [{ type: "italic" }]))] });
  });

  it("baja h1 a h2 y no deja niveles inventados", () => {
    const clean = sanitizeDoc({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [t("a")] },
        { type: "heading", attrs: { level: 3, id: "x" }, content: [t("b")] },
      ],
    });
    expect(clean.content?.map((n) => n.attrs)).toEqual([{ level: 2 }, { level: 3 }]);
  });

  it("no acepta un párrafo dentro de un párrafo ni texto suelto en el documento", () => {
    const clean = sanitizeDoc({ type: "doc", content: [t("suelto"), p(p(t("anidado")), t("ok"))] });
    expect(clean).toEqual({ type: "doc", content: [p(t("ok"))] });
  });

  it("ante cualquier cosa que no es un documento, devuelve uno vacío", () => {
    for (const input of [null, "texto", 42, [], { type: "paragraph" }, { type: "doc", content: "x" }]) {
      expect(sanitizeDoc(input)).toEqual({ type: "doc", content: [] });
    }
  });
});
