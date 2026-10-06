"use client";

import { useState } from "react";

type ShareButtonsProps = { url: string; title: string };

/**
 * Compartir por WhatsApp, X y Facebook con enlaces simples (sin scripts de terceros
 * ni rastreo), y copiar el enlace. Los enlaces funcionan aunque JavaScript no cargue.
 */
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState<"ok" | "error" | null>(null);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title);
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: "X", href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedText}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
  ];
  const item =
    "inline-flex min-h-10 items-center rounded-sm border border-rule px-3 text-sm font-medium hover:border-ink";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm text-ink-subtle">Compartir</span>
      {targets.map((target) => (
        <a key={target.label} href={target.href} target="_blank" rel="noopener noreferrer" className={item}>
          {target.label}
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      ))}
      <button type="button" onClick={copy} className={item}>
        Copiar enlace
      </button>
      <span role="status" className="text-sm text-ink-subtle">
        {copied === "ok" ? "Enlace copiado." : copied === "error" ? "No se pudo copiar el enlace." : ""}
      </span>
    </div>
  );
}
