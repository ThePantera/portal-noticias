"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { DollarRates } from "@/types/exchange";

/** Cada cuánto se vuelven a pedir las cotizaciones mientras la pestaña está a la vista. */
const REFRESH_MS = 60_000;

/*
 * Un solo pedido por minuto para toda la página, aunque haya varios paneles: comparten
 * este almacén. Si la pestaña está oculta no se pide nada; al volver, se actualiza.
 */
let latest: DollarRates | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let pending: Promise<void> | null = null;

function refresh(): Promise<void> {
  if (document.visibilityState === "hidden") return Promise.resolve();
  pending ??= load().finally(() => {
    pending = null;
  });
  return pending;
}

async function load() {
  try {
    const response = await fetch("/api/cotizaciones", { cache: "no-store" });
    if (!response.ok) return;
    const rates = (await response.json()) as DollarRates | null;
    if (!rates || rates.fetchedAt === latest?.fetchedAt) return;
    latest = rates;
    for (const listener of listeners) listener();
  } catch {
    // Sin conexión: queda el último valor y se reintenta en el próximo ciclo.
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") void refresh();
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

function newest(a: DollarRates | null, b: DollarRates | null): DollarRates | null {
  if (!a || !b) return a ?? b;
  return Date.parse(a.fetchedAt) >= Date.parse(b.fetchedAt) ? a : b;
}

/**
 * Cotizaciones en vivo. Arranca con las que vinieron renderizadas del servidor y, si son de
 * hace más de un minuto (la página puede venir de caché), las pide de nuevo enseguida.
 */
export function useDollarRates(initial: DollarRates | null): DollarRates | null {
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
