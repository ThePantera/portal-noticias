/**
 * Tipos mínimos del documento del editor (JSON de Tiptap/ProseMirror) y utilidades
 * puras sobre él. `sanitizeDoc` es la barrera contra XSS: el servidor la aplica antes de
 * guardar, y el render público sólo conoce los nodos que deja pasar.
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

// ───────────────────────────── Sanitización ─────────────────────────────

const INLINE = new Set(["text", "hardBreak"]);
const BLOCKS = new Set(["paragraph", "heading", "blockquote", "bulletList", "orderedList", "horizontalRule"]);

/** Qué hijos acepta cada nodo. Lo que no está acá se descarta. */
const CHILDREN: Record<string, ReadonlySet<string>> = {
  doc: BLOCKS,
  paragraph: INLINE,
  heading: INLINE,
  blockquote: BLOCKS,
  bulletList: new Set(["listItem"]),
  orderedList: new Set(["listItem"]),
  listItem: BLOCKS,
  horizontalRule: new Set(),
  hardBreak: new Set(),
  text: new Set(),
};

const MARKS = new Set(["bold", "italic", "underline", "strike", "link"]);
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const MAX_DEPTH = 12;
const MAX_TEXT_LENGTH = 20_000;

/** Devuelve el href si es http, https o mailto; si no, null. Bloquea `javascript:`, `data:`, etc. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function sanitizeMarks(marks: unknown): EditorMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const clean: EditorMark[] = [];
  for (const mark of marks as { type?: unknown; attrs?: { href?: unknown } }[]) {
    if (typeof mark?.type !== "string" || !MARKS.has(mark.type)) continue;
    if (clean.some((m) => m.type === mark.type)) continue;
    if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      // Un enlace inseguro se descarta, pero el texto queda.
      if (href) clean.push({ type: "link", attrs: { href } });
      continue;
    }
    clean.push({ type: mark.type });
  }
  return clean.length > 0 ? clean : undefined;
}

function sanitizeAttrs(type: string, attrs: unknown): EditorAttrs | undefined {
  const source = (attrs ?? {}) as Record<string, unknown>;
  if (type === "heading") {
    // El título de la nota es el h1: dentro del cuerpo sólo hay h2 y h3.
    return { level: source.level === 3 ? 3 : 2 };
  }
  if (type === "orderedList") {
    const start = Number(source.start);
    return { start: Number.isInteger(start) && start > 0 && start < 10_000 ? start : 1 };
  }
  return undefined;
}

function sanitizeNode(input: unknown, allowed: ReadonlySet<string>, depth: number): EditorNode | null {
  if (depth > MAX_DEPTH || typeof input !== "object" || input === null) return null;
  const node = input as {
    type?: unknown;
    text?: unknown;
    content?: unknown;
    marks?: unknown;
    attrs?: unknown;
  };
  if (typeof node.type !== "string" || !allowed.has(node.type)) return null;
  const type = node.type;

  if (type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) return null;
    const marks = sanitizeMarks(node.marks);
    return { type, text: node.text.slice(0, MAX_TEXT_LENGTH), ...(marks ? { marks } : {}) };
  }

  const result: EditorNode = { type };
  const attrs = sanitizeAttrs(type, node.attrs);
  if (attrs) result.attrs = attrs;

  const childTypes = CHILDREN[type];
  if (childTypes && childTypes.size > 0) {
    const children = Array.isArray(node.content)
      ? node.content
          .map((child) => sanitizeNode(child, childTypes, depth + 1))
          .filter((child): child is EditorNode => child !== null)
      : [];
    // Una lista o una cita sin contenido válido no aporta nada: se descarta.
    if (children.length === 0 && ["bulletList", "orderedList", "listItem", "blockquote"].includes(type)) {
      return null;
    }
    if (children.length > 0) result.content = children;
  }
  return result;
}

/**
 * Deja el documento sólo con nodos, marcas y atributos de la lista cerrada. Nunca lanza:
 * cualquier cosa que no reconoce la descarta. Un documento inválido devuelve uno vacío.
 */
export function sanitizeDoc(input: unknown): EditorDoc {
  const clean = sanitizeNode(input, new Set(["doc"]), 0);
  return clean ? { ...clean, type: "doc", content: clean.content ?? [] } : { ...EMPTY_DOC, content: [] };
}
