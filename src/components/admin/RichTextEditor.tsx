"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useId, useState } from "react";
import { safeHref, type EditorDoc } from "@/lib/content";

/**
 * Editor del cuerpo de la nota (Tiptap). Sólo ofrece lo que el render público sabe
 * mostrar: párrafos, subtítulos h2/h3, listas, citas, separador, negrita, cursiva,
 * subrayado, tachado y enlaces. El servidor vuelve a sanitizar al guardar.
 */
export function RichTextEditor({
  initialContent,
  onChange,
  invalid,
  describedBy,
}: {
  initialContent: EditorDoc;
  onChange: (doc: EditorDoc) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const editor = useEditor({
    // El panel se renderiza en el servidor: el editor recién se monta en el navegador.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url) => safeHref(url) !== null,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "article-body min-h-80 px-4 py-4 outline-none sm:px-6",
        "aria-label": "Cuerpo de la nota",
        "aria-multiline": "true",
        role: "textbox",
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as EditorDoc),
  });

  return (
    <div
      className={`rounded-md border bg-surface focus-within:border-accent ${invalid ? "border-danger" : "border-rule"}`}
    >
      {editor ? <Toolbar editor={editor} /> : <div className="h-11 border-b border-rule" aria-hidden />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
      link: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const chain = () => editor.chain().focus();

  return (
    <div className="sticky top-0 z-10 border-b border-rule bg-surface">
      <div role="toolbar" aria-label="Formato" className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        <ToolButton
          label="Negrita"
          shortcut="Ctrl+B"
          active={state.bold}
          onClick={() => chain().toggleBold().run()}
        >
          <span className="font-bold">N</span>
        </ToolButton>
        <ToolButton
          label="Cursiva"
          shortcut="Ctrl+I"
          active={state.italic}
          onClick={() => chain().toggleItalic().run()}
        >
          <span className="italic">K</span>
        </ToolButton>
        <ToolButton
          label="Subrayado"
          shortcut="Ctrl+U"
          active={state.underline}
          onClick={() => chain().toggleUnderline().run()}
        >
          <span className="underline">S</span>
        </ToolButton>
        <ToolButton label="Tachado" active={state.strike} onClick={() => chain().toggleStrike().run()}>
          <span className="line-through">abc</span>
        </ToolButton>
        <Separator />
        <ToolButton
          label="Subtítulo"
          active={state.h2}
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolButton>
        <ToolButton
          label="Subtítulo menor"
          active={state.h3}
          onClick={() => chain().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolButton>
        <Separator />
        <ToolButton label="Lista" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
          •
        </ToolButton>
        <ToolButton
          label="Lista numerada"
          active={state.orderedList}
          onClick={() => chain().toggleOrderedList().run()}
        >
          1.
        </ToolButton>
        <ToolButton label="Cita" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}>
          “”
        </ToolButton>
        <ToolButton label="Separador" onClick={() => chain().setHorizontalRule().run()}>
          —
        </ToolButton>
        <ToolButton
          label="Enlace"
          active={state.link || linkOpen}
          onClick={() => setLinkOpen((open) => !open)}
        >
          Enlace
        </ToolButton>
        <Separator />
        <ToolButton
          label="Deshacer"
          shortcut="Ctrl+Z"
          disabled={!state.canUndo}
          onClick={() => chain().undo().run()}
        >
          ↶
        </ToolButton>
        <ToolButton
          label="Rehacer"
          shortcut="Ctrl+Shift+Z"
          disabled={!state.canRedo}
          onClick={() => chain().redo().run()}
        >
          ↷
        </ToolButton>
      </div>
      {linkOpen ? <LinkBar editor={editor} onClose={() => setLinkOpen(false)} /> : null}
    </div>
  );
}

function LinkBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const inputId = useId();
  const current = editor.getAttributes("link").href as string | undefined;
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const raw = value.trim();
    const href = safeHref(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (!href) {
      setError("Usá una dirección que empiece con https://, http:// o mailto:.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onClose();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-rule px-3 py-2">
      <label htmlFor={inputId} className="text-sm text-ink-muted">
        Dirección del enlace
      </label>
      <input
        id={inputId}
        type="url"
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
          if (e.key === "Escape") onClose();
        }}
        placeholder="https://"
        className="min-w-0 flex-1 rounded-sm border border-rule bg-paper px-2 py-1 text-sm"
        aria-invalid={error ? true : undefined}
      />
      <button
        type="button"
        onClick={apply}
        className="rounded-sm bg-ink px-3 py-1 text-sm font-semibold text-paper"
      >
        Aplicar
      </button>
      {current ? (
        <button
          type="button"
          onClick={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            onClose();
          }}
          className="text-sm text-danger underline"
        >
          Quitar enlace
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      // Evita que el botón le robe la selección al editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`min-h-9 min-w-9 rounded-sm px-2 text-sm font-semibold disabled:opacity-40 ${
        active ? "bg-accent-soft text-accent-strong" : "text-ink-muted hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-rule" />;
}
