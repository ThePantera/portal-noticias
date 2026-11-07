import { Suspense } from "react";
import { formatDateTime } from "@/lib/dates";
import { requirePermission } from "@/server/auth/current-user";
import { listContactMessages } from "@/server/services/contact";

async function Messages() {
  await requirePermission("dashboard:view");
  const messages = await listContactMessages();

  return (
    <div className="grid gap-6">
      <div>
        <p className="kicker">Contacto</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Mensajes de los lectores</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Los que llegan desde la página /contacto, del más nuevo al más viejo.
        </p>
      </div>
      {messages.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule p-8 text-center text-ink-muted">
          Todavía no llegó ningún mensaje.
        </p>
      ) : (
        <ul className="grid gap-4">
          {messages.map((m) => (
            <li key={m.id} className="rounded-md border border-rule bg-surface p-4">
              <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {m.name} ·{" "}
                  <a href={`mailto:${m.email}`} className="text-accent underline">
                    {m.email}
                  </a>
                </span>
                <span className="text-ink-subtle">{formatDateTime(m.createdAt)}</span>
              </p>
              <p className="mt-3 whitespace-pre-line">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-subtle">Cargando los mensajes…</p>}>
      <Messages />
    </Suspense>
  );
}
