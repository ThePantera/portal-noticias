"use client";

import { useEffect } from "react";

/**
 * Avisa al servidor que se abrió la nota, para el conteo de lecturas. Una vez por nota y por
 * pestaña: recargar la página no suma de nuevo. No usa cookies ni manda datos del lector.
 */
export function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    const key = `leida:${articleId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Sin almacenamiento (modo privado estricto): se cuenta igual.
    }
    fetch("/api/vistas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
      keepalive: true,
    }).catch(() => {});
  }, [articleId]);
  return null;
}
