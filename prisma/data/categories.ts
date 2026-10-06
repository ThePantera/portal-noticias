/** Categorías iniciales. Después se administran desde el panel; el seed no pisa cambios hechos ahí. */
export const INITIAL_CATEGORIES = [
  { name: "Política", slug: "politica", description: "Gobierno, Congreso, elecciones y partidos." },
  { name: "Economía", slug: "economia", description: "Inflación, empleo, mercados y finanzas personales." },
  {
    name: "Tecnología",
    slug: "tecnologia",
    description: "Innovación, empresas tecnológicas y vida digital.",
  },
  { name: "Mundo", slug: "mundo", description: "Lo que pasa fuera del país." },
  { name: "Sociedad", slug: "sociedad", description: "Educación, salud, transporte y vida cotidiana." },
  { name: "Seguridad", slug: "seguridad", description: "Policiales, justicia y prevención." },
  { name: "Deportes", slug: "deportes", description: "Fútbol, básquet, tenis y más." },
  { name: "Cultura", slug: "cultura", description: "Libros, cine, música, teatro y arte." },
  { name: "Ciencia", slug: "ciencia", description: "Investigación, ambiente y espacio." },
  { name: "Tendencias", slug: "tendencias", description: "Lo que se habla en redes y en la calle." },
] as const;
