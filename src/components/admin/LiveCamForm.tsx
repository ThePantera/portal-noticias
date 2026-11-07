"use client";

import { useActionState } from "react";
import type { CamFormState } from "@/app/admin/(panel)/camaras/actions";

const FIELD = "w-full rounded-sm border border-rule bg-surface px-3 py-2 text-base";

type LiveCamFormProps = { addCam: (prev: CamFormState, data: FormData) => Promise<CamFormState> };

/** Alta de una cámara: el enlace de YouTube, un nombre y el lugar. */
export function LiveCamForm({ addCam }: LiveCamFormProps) {
  const [state, action, pending] = useActionState(addCam, {});
  return (
    <form action={action} className="grid gap-3 rounded-md border border-rule bg-surface p-4">
      <label className="grid gap-1 text-sm font-medium">
        Enlace de YouTube
        <input name="link" required placeholder="https://www.youtube.com/watch?v=…" className={FIELD} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Nombre
          <input name="title" required maxLength={80} placeholder="Playa Grande" className={FIELD} />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Lugar
          <input name="place" required maxLength={80} placeholder="Mar del Plata" className={FIELD} />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-success">
          {state.ok}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start rounded-sm bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar cámara"}
      </button>
    </form>
  );
}
