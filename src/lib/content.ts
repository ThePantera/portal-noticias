/**
 * Tipos mínimos del documento del editor (JSON de Tiptap/ProseMirror) y utilidades
 * puras sobre él. El render seguro a HTML llega con el editor (Fase 6).
 */
/** Los atributos de Tiptap son valores simples; tiparlos así permite guardar el documento como JSON. */
export type EditorAttrs = Record<string, string | number | boolean | null>;

export type EditorMark = { type: string; attrs?: EditorAttrs };

export type EditorNode = {
  type: string;
  attrs?: EditorAttrs;
  content?: EditorNode[];
  marks?: EditorMark[];
  text?: string;
};

export type EditorDoc = EditorNode & { type: "doc" };

export const EMPTY_DOC: EditorDoc = { type: "doc", content: [] };

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "codeBlock",
  "horizontalRule",
  "image",
]);

/** Texto plano del documento, con un salto de línea entre bloques. Alimenta búsqueda y tiempo de lectura. */
export function extractPlainText(node: EditorNode): string {
  const parts: string[] = [];
  const walk = (n: EditorNode) => {
    if (n.type === "text" && n.text) parts.push(n.text);
    if (n.type === "hardBreak") parts.push("\n");
    n.content?.forEach(walk);
    if (BLOCK_TYPES.has(n.type)) parts.push("\n");
  };
  walk(node);
  return parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

const WORDS_PER_MINUTE = 220;

/** Minutos de lectura, redondeando hacia arriba, con un mínimo de 1. */
export function readingTimeMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
