import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/server/auth/current-user";
import { env } from "@/server/env";
import { logoutAction } from "./actions";

/** Sólo renderiza el panel (y sus páginas) después de validar la sesión contra la base. */
async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/admin" className="font-display text-xl font-bold">
            {env.SITE_NAME} <span className="ml-1 kicker">Panel</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ink-muted">{user.name}</span>
            <a href="/" target="_blank" rel="noreferrer" className="text-ink-muted hover:text-ink">
              Ver el portal
            </a>
            <form action={logoutAction}>
              <button type="submit" className="font-semibold text-accent underline-offset-4 hover:underline">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-site flex-1 px-4 py-8 md:px-8">{children}</main>
    </>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-ink-subtle md:px-8">Cargando el panel…</p>}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
