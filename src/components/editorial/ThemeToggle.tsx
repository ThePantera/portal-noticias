"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Avisa cuando cambia data-theme en <html> (lo cambia este botón o el script del layout). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Botón para pasar del tema oscuro (el de siempre) al claro y volver. Recuerda la elección. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Sin almacenamiento (modo privado): el cambio vale hasta recargar.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === "light" ? "Usar tema claro" : "Usar tema oscuro"}
      title={next === "light" ? "Tema claro" : "Tema oscuro"}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-rule bg-surface text-ink-muted shadow-card transition-colors hover:text-ink"
    >
      {theme === "dark" ? (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
          <circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M4 16l1.4-1.4M14.6 5.4 16 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
          <path
            d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
