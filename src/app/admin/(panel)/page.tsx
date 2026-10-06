import Link from "next/link";
import { Suspense } from "react";
import { RecentArticles } from "@/components/admin/RecentArticles";
import { StatusCard } from "@/components/admin/StatusCard";
import { STATUS_ORDER } from "@/lib/article-status";
import { requirePermission } from "@/server/auth/current-user";
import { countArticlesByStatus, countOverdueScheduled, listRecentArticles } from "@/server/services/articles";

async function Dashboard() {
  const user = await requirePermission("dashboard:view");
  const [counts, overdue, recent] = await Promise.all([
    countArticlesByStatus(),
    countOverdueScheduled(),
    listRecentArticles(),
  ]);

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Tablero</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Hola, {user.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {counts.total === 1 ? "1 nota en total" : `${counts.total} notas en total`}
          </p>
        </div>
        <Link
          href="/admin/notas/nueva"
          className="rounded-sm bg-ink px-4 py-2.5 text-sm font-semibold text-paper"
        >
          Escribir una nota
        </Link>
      </div>

      {overdue > 0 ? (
        <p role="alert" className="rounded-md border border-warning px-4 py-3 text-sm text-warning">
          {overdue === 1
            ? "Hay 1 nota programada cuya hora ya pasó y sigue sin publicarse."
            : `Hay ${overdue} notas programadas cuya hora ya pasó y siguen sin publicarse.`}{" "}
          El publicador automático corre cada 5 minutos: si el aviso sigue, revisá que esté configurado (paso
          8 de la guía de deploy).
        </p>
      ) : null}

      <section aria-labelledby="estados" className="grid gap-4">
        <h2 id="estados" className="sr-only">
          Notas por estado
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <StatusCard key={status} status={status} count={counts[status]} />
          ))}
        </div>
      </section>

      <section aria-labelledby="recientes" className="grid gap-4">
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-ink pt-3">
          <h2 id="recientes" className="text-sm font-bold tracking-wide uppercase">
            Últimas editadas
          </h2>
          {counts.total > 0 ? (
            <Link href="/admin/notas" className="text-sm font-medium text-accent">
              Ver todas
            </Link>
          ) : null}
        </div>
        <RecentArticles articles={recent} />
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando el tablero…</p>}>
      <Dashboard />
    </Suspense>
  );
}
