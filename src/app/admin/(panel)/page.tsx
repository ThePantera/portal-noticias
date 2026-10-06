import { Suspense } from "react";
import { requirePermission } from "@/server/auth/current-user";

async function Welcome() {
  // Cada página valida por su cuenta: el layout no se vuelve a ejecutar en todas las navegaciones.
  const user = await requirePermission("dashboard:view");
  return (
    <>
      <h1 className="font-display text-3xl font-semibold">Hola, {user.name}</h1>
      <p className="mt-3 max-w-measure text-ink-muted">
        El tablero con tus notas, borradores y programadas llega en la Fase 5.
      </p>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Welcome />
    </Suspense>
  );
}
