import type { ReactNode } from "react";
import { safeHref, sanitizeDoc, type EditorMark, type EditorNode } from "@/lib/content";

/**
 * Cuerpo de una nota a partir del JSON del editor. Arma elementos de React, nunca HTML
 * crudo, y sólo conoce los nodos de la lista cerrada: aunque la base tuviera algo raro,
 * acá no se convierte en código.
 */
export function ArticleBody({ content, className = "" }: { content: unknown; className?: string }) {
  const doc = sanitizeDoc(content);
  return (
    <div className={`article-body ${className}`}>{doc.content?.map((node, i) => renderNode(node, i))}</div>
  );
}

function renderChildren(node: EditorNode): ReactNode {
  return node.content?.map((child, i) => renderNode(child, i));
}

function renderNode(node: EditorNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{renderChildren(node)}</p>;
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{renderChildren(node)}</h3>
      ) : (
        <h2 key={key}>{renderChildren(node)}</h2>
      );
    case "blockquote":
      return <blockquote key={key}>{renderChildren(node)}</blockquote>;
    case "bulletList":
      return <ul key={key}>{renderChildren(node)}</ul>;
    case "orderedList": {
      const start =
        typeof node.attrs?.start === "number" && node.attrs.start !== 1 ? node.attrs.start : undefined;
      return (
        <ol key={key} start={start}>
          {renderChildren(node)}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{renderChildren(node)}</li>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return <span key={key}>{applyMarks(node.text ?? "", node.marks ?? [])}</span>;
    default:
      return null;
  }
}

function applyMarks(text: string, marks: EditorMark[]): ReactNode {
  return marks.reduce<ReactNode>((inner, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{inner}</strong>;
      case "italic":
        return <em>{inner}</em>;
      case "underline":
        return <u>{inner}</u>;
      case "strike":
        return <s>{inner}</s>;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return inner;
        const external = !href.startsWith("mailto:");
        return (
          <a href={href} {...(external ? { rel: "noopener noreferrer nofollow", target: "_blank" } : {})}>
            {inner}
          </a>
        );
      }
      default:
        return inner;
    }
  }, text);
}
