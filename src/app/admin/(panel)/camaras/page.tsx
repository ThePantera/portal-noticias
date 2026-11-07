import { Suspense } from "react";
import { LiveCamForm } from "@/components/admin/LiveCamForm";
import { watchUrl } from "@/lib/live-cams";
import { requirePermission } from "@/server/auth/current-user";
import { listLiveCams } from "@/server/services/live-cams";
import { addCamAction, deleteCamAction } from "./actions";

async function Cams() {
  await requirePermission("article:publish");
  const cams = await listLiveCams();

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">En vivo</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Cámaras en vivo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Las transmisiones de YouTube que se ven en /en-vivo. Si un video deja de existir, el sitio lo oculta
          solo.
        </p>
      </div>
      <LiveCamForm addCam={addCamAction} />
      <ul className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule">
        {cams.map((cam) => (
          <li key={cam.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4">
            <div>
              <p className="font-semibold">{cam.title}</p>
              <p className="text-sm text-ink-muted">
                {cam.place} ·{" "}
                <a href={watchUrl(cam.youtubeId)} target="_blank" rel="noreferrer" className="underline">
                  ver en YouTube
                </a>
              </p>
            </div>
            <form action={deleteCamAction}>
              <input type="hidden" name="id" value={cam.id} />
              <button type="submit" className="text-sm font-semibold text-danger hover:underline">
                Quitar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CamsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando las cámaras…</p>}>
      <Cams />
    </Suspense>
  );
}
