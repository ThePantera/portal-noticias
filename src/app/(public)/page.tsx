export default function HomePage() {
  return (
    <section className="mx-auto max-w-site px-4 py-16 md:px-8">
      <p className="kicker">Portada</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight font-semibold md:text-5xl">
        Todavía no hay noticias publicadas
      </h1>
      <p className="mt-4 max-w-measure font-body text-md text-ink-muted">
        Cuando se publique la primera nota desde el panel de administración, va a aparecer acá.
      </p>
    </section>
  );
}
