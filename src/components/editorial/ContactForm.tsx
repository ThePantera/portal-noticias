"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_LIMITS, validateContact } from "@/lib/contact";

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

const FIELD =
  "w-full rounded-sm border border-rule bg-surface px-3 py-2.5 text-base text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none";

/** Formulario de contacto. Valida lo mismo que la API antes de mandar. */
export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const checked = validateContact(data);
    if (!checked.ok) {
      setStatus({ kind: "error", message: checked.error });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked.data),
      });
      if (response.ok) {
        form.reset();
        setStatus({ kind: "sent" });
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus({ kind: "error", message: body?.error ?? "No se pudo mandar. Probá de nuevo." });
    } catch {
      setStatus({ kind: "error", message: "No se pudo mandar. Revisá la conexión y probá de nuevo." });
    }
  }

  if (status.kind === "sent") {
    return (
      <p role="status" className="rounded-md border border-rule bg-surface px-4 py-3">
        Gracias, recibimos tu mensaje. Si hace falta, te respondemos por correo.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <label className="grid gap-1.5 text-sm font-medium">
        Nombre
        <input name="name" autoComplete="name" maxLength={CONTACT_LIMITS.name} required className={FIELD} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Correo
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={CONTACT_LIMITS.email}
          required
          className={FIELD}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Mensaje
        <textarea name="message" rows={6} maxLength={CONTACT_LIMITS.message} required className={FIELD} />
      </label>
      {status.kind === "error" ? (
        <p role="alert" className="text-sm text-danger">
          {status.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="justify-self-start rounded-sm bg-ink px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {status.kind === "sending" ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
