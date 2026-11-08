"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LIVE_REFRESH_MS } from "@/lib/article-extras";

/**
 * Cobertura en vivo: pide la nota de nuevo cada minuto mientras la pestaña está a la vista,
 * así las actualizaciones aparecen sin recargar. No hace nada con la pestaña en segundo plano.
 */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
