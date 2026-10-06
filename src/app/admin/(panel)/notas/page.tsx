import type { Metadata } from "next";
import { Suspense } from "react";
import { requirePermission } from "@/server/auth/current-user";

export const metadata: Metadata = { title: "Notas" };

async function ArticleList() {
  await requirePermission("dashboard:view");
  return (
    <>
      <p className="kicker">Notas</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Listado de notas</h1>
      <p className="mt-3 max-w-measure text-ink-muted">
        El listado con filtros por estado, categoría y búsqueda llega con el CRUD, en la Fase 6.
      </p>
    </>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={null}>
      <ArticleList />
    </Suspense>
  );
}
