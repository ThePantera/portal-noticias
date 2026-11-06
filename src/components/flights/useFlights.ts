"use client";

import { useEffect, useSyncExternalStore } from "react";
import { FLIGHTS_REFRESH_MS } from "@/lib/flights";
import type { FlightsSnapshot } from "@/types/flights";

/*
 * Mismo esquema que useMarkets: un solo pedido para toda la página y nada con la pestaña
 * oculta. Al volver a la pestaña se piden enseguida, porque las posiciones envejecen rápido.
 */
let latest: FlightsSnapshot | null = null;
/** "loading" hasta la primera respuesta; "error" si la última vez no hubo datos. */
let status: "loading" | "ok" | "error" = "loading";
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let pending: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function refresh(): Promise<void> {
  if (document.visibilityState === "hidden") return Promise.resolve();
  pending ??= load().finally(() => {
    pending = null;
  });
  return pending;
}

async function load() {
  try {
    const response = await fetch("/api/vuelos", { cache: "no-store" });
    const snapshot = response.ok ? ((await response.json()) as FlightsSnapshot | null) : null;
    if (snapshot) {
      latest = snapshot;
      status = "ok";
    } else if (!latest) {
      status = "error";
    }
  } catch {
    // Sin conexión: quedan las últimas posiciones y se reintenta en el próximo ciclo.
    if (!latest) status = "error";
  }
  emit();
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") void refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(refresh, FLIGHTS_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}

let view = { snapshot: latest, status };
function getView() {
  if (view.snapshot !== latest || view.status !== status) view = { snapshot: latest, status };
  return view;
}
const SERVER_VIEW = { snapshot: null, status: "loading" as const };

/** Vuelos en vivo: se piden al abrir la página y después cada 15 segundos. */
export function useFlights(): { snapshot: FlightsSnapshot | null; status: "loading" | "ok" | "error" } {
  const current = useSyncExternalStore(subscribe, getView, () => SERVER_VIEW);
  useEffect(() => {
    void refresh();
  }, []);
  return current;
}
