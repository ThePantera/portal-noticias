"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  QUICK_REACTIONS,
  REACTION_GROUPS,
  normalizeEmoji,
  toggleLocally,
  type ReactionSummary,
} from "@/lib/reactions";

const EMPTY: ReactionSummary = { reactions: [], mine: [] };

function plural(count: number) {
  return count === 1 ? "1 reacción" : `${count} reacciones`;
}

/**
 * Reacciones anónimas con emojis debajo de cada nota (ADR 0010). Los conteos se piden al
 * cargar (la nota viene de caché) y cada toque se ve al instante; si el servidor lo
 * rechaza, se vuelve a lo que diga él. Sin JavaScript no se muestra nada.
 */
export function ArticleReactions({ articleId }: { articleId: string }) {
  const [summary, setSummary] = useState<ReactionSummary | null>(null);
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const pickerId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const endpoint = `/api/reacciones/${encodeURIComponent(articleId)}`;

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<ReactionSummary>) : EMPTY))
      .catch(() => EMPTY)
      .then((data) => {
        if (!cancelled) setSummary(data);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  // El selector se cierra con Escape o tocando afuera.
  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPickerOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (!sectionRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [pickerOpen]);

  async function react(emoji: string) {
    const before = summary ?? EMPTY;
    setSummary(toggleLocally(before, emoji));
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (response.ok && data) {
        setSummary(data as ReactionSummary);
      } else {
        setSummary(before);
        const error = data && typeof data === "object" && "error" in data ? String(data.error) : null;
        setMessage(error ?? "No se pudo guardar la reacción.");
      }
    } catch {
      setSummary(before);
      setMessage("Sin conexión: no se pudo guardar la reacción.");
    }
  }

  function pick(emoji: string) {
    setPickerOpen(false);
    setCustom("");
    void react(emoji);
  }

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emoji = normalizeEmoji(custom);
    if (!emoji) {
      setMessage("Escribí o pegá un solo emoji.");
      return;
    }
    pick(emoji);
  }

  const current = summary ?? EMPTY;
  const counts = new Map(current.reactions.map((r) => [r.emoji, r.count]));
  const shown = [
    ...current.reactions.map((r) => r.emoji),
    ...QUICK_REACTIONS.filter((emoji) => !counts.has(emoji)),
  ];
  const total = current.reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="reacciones"
      aria-busy={summary === null}
      className="relative mt-10 rounded-card border border-rule bg-surface p-4 shadow-card md:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reacciones" className="font-display text-lg font-bold">
          ¿Qué te pareció?
        </h2>
        <p className="text-sm text-ink-subtle tabular-nums">
          {summary === null ? "Cargando reacciones…" : total ? plural(total) : "Todavía no hay reacciones"}
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {shown.map((emoji) => {
          const count = counts.get(emoji) ?? 0;
          const mine = current.mine.includes(emoji);
          return (
            <li key={emoji}>
              <button
                type="button"
                aria-pressed={mine}
                aria-label={`${emoji} ${count ? plural(count) : "sin reacciones"}${mine ? ", la tuya" : ""}`}
                onClick={() => void react(emoji)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-rule bg-paper px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-ink hover:text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent-strong"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {emoji}
                </span>
                {count ? <span className="tabular-nums">{count}</span> : null}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-expanded={pickerOpen}
            aria-controls={pickerId}
            onClick={() => setPickerOpen((open) => !open)}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-dashed border-rule px-3 text-sm font-semibold text-ink-muted hover:border-ink hover:text-ink"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ＋
            </span>
            Otro emoji
          </button>
        </li>
      </ul>
      {pickerOpen ? (
        <div
          id={pickerId}
          role="group"
          aria-label="Elegí un emoji"
          className="mt-3 grid gap-3 rounded-card border border-rule bg-paper p-3"
        >
          <div className="grid max-h-64 gap-3 overflow-y-auto overscroll-contain">
            {REACTION_GROUPS.map((group) => (
              <div key={group.name}>
                <p className="mb-1 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
                  {group.name}
                </p>
                <div className="grid grid-cols-8 gap-0.5 sm:grid-cols-12">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={emoji}
                      onClick={() => pick(emoji)}
                      className="grid aspect-square place-items-center rounded-sm text-xl hover:bg-surface-muted"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={submitCustom} className="flex gap-2 border-t border-rule pt-3">
            <label className="sr-only" htmlFor={`${pickerId}-otro`}>
              Cualquier otro emoji
            </label>
            <input
              id={`${pickerId}-otro`}
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder="Pegá cualquier emoji"
              autoComplete="off"
              enterKeyHint="send"
              className="min-h-10 w-full min-w-0 rounded-sm border border-rule bg-surface px-3 text-base"
            />
            <button
              type="submit"
              className="min-h-10 shrink-0 rounded-sm bg-accent px-3 text-sm font-semibold text-surface hover:bg-accent-strong"
            >
              Listo
            </button>
          </form>
        </div>
      ) : null}

      <p role="status" className="mt-2 min-h-5 text-sm text-danger">
        {message}
      </p>
      <p className="text-xs text-ink-subtle">
        Las reacciones son anónimas. Podés dejar varias y tocar de nuevo para sacarlas.
      </p>
    </section>
  );
}
