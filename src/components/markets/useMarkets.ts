"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { MarketsSnapshot } from "@/types/markets";

/** Cada cuánto se vuelven a pedir los mercados mientras la pestaña está a la vista. */
const REFRESH_MS = 30 * 60_000;

/*
 * Mismo esquema que useDollarRates: un solo pedido para toda la página, nada con la pestaña
 * oculta y una actualización al volver si pasó la media hora.
 */
let latest: MarketsSnapshot | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let pending: Promise<void> | null = null;
let lastLoad = 0;

function refresh(): Promise<void> {
  if (document.visibilityState === "hidden") return Promise.resolve();
  pending ??= load().finally(() => {
    pending = null;
  });
  return pending;
}

async function load() {
  lastLoad = Date.now();
  try {
    const response = await fetch("/api/mercados", { cache: "no-store" });
    if (!response.ok) return;
    const markets = (await response.json()) as MarketsSnapshot | null;
    if (!markets || markets.fetchedAt === latest?.fetchedAt) return;
    latest = markets;
    for (const listener of listeners) listener();
  } catch {
    // Sin conexión: quedan los últimos datos y se reintenta en el próximo ciclo.
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible" && Date.now() - lastLoad > REFRESH_MS) void refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(refresh, REFRESH_MS);
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

function newest(a: MarketsSnapshot | null, b: MarketsSnapshot | null): MarketsSnapshot | null {
  if (!a || !b) return a ?? b;
  return Date.parse(a.fetchedAt) >= Date.parse(b.fetchedAt) ? a : b;
}

/**
 * Mercados en vivo. Arranca con los que vinieron renderizados del servidor y, si son de hace
 * más de media hora (la página puede venir de caché), los pide de nuevo enseguida.
 */
export function useMarkets(initial: MarketsSnapshot | null): MarketsSnapshot | null {
  const live = useSyncExternalStore(
    subscribe,
    () => latest,
    () => null,
  );
  const fetchedAt = initial?.fetchedAt;
  useEffect(() => {
    if (!fetchedAt || Date.now() - Date.parse(fetchedAt) > REFRESH_MS) void refresh();
  }, [fetchedAt]);
  return newest(live, initial);
}
