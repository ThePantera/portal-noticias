import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-site flex-1 flex-col justify-center px-4 py-24 md:px-8">
      <p className="kicker">Error 404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold">No encontramos esta página</h1>
      <p className="mt-4 max-w-measure text-ink-muted">
        Puede que la nota se haya movido o que el enlace esté mal escrito.
      </p>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent underline underline-offset-4">
        Volver a la portada
      </Link>
    </main>
  );
}
