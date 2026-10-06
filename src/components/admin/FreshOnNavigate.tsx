"use client";

import { useRouter } from "next/navigation";
import { Fragment } from "react";

/**
 * Next conserva el estado de las páginas visitadas (Activity). Para "Nueva nota" eso
 * significa volver a encontrar la nota anterior ya cargada, y crearla dos veces. Con
 * `bfcacheId` como key, cada navegación nueva arranca en blanco, pero el botón Atrás
 * del navegador sigue recuperando lo que se estaba escribiendo.
 */
export function FreshOnNavigate({ children }: { children: React.ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
