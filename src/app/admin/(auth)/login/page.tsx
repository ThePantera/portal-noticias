import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";
import { safeAdminPath } from "@/lib/redirect";
import { getCurrentUser } from "@/server/auth/current-user";
import { env } from "@/server/env";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Iniciar sesión" };

async function LoginGate({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const { next } = await searchParams;
  const target = safeAdminPath(next);
  if (await getCurrentUser()) redirect(target);
  return <LoginForm action={loginAction} next={target === "/admin" ? undefined : target} />;
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="kicker">{env.SITE_NAME}</p>
        <h1 className="mt-2 mb-8 font-display text-3xl font-semibold">Iniciar sesión</h1>
        <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando…</p>}>
          <LoginGate searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
