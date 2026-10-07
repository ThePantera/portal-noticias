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
  // Agregada después del lanzamiento: en las bases que ya estaban en uso la crea la migración
  // 20261007010000_gaming_category.
  {
    name: "Gaming",
    slug: "gaming",
    description: "Videojuegos, consolas, esports y la industria del juego.",
  },
  // Secciones IT (2026-10-07). En las bases que ya estaban en uso las crea la migración
  // 20261007040000_secciones_it, que además oculta las secciones generales.
  {
    name: "Inteligencia Artificial",
    slug: "ia",
    description: "Modelos, herramientas y empresas de IA, y cómo cambian el trabajo.",
  },
  {
    name: "Programación",
    slug: "programacion",
    description: "Lenguajes, frameworks, open source y herramientas para desarrollar.",
  },
  {
    name: "Ciberseguridad",
    slug: "ciberseguridad",
    description: "Vulnerabilidades, ataques, filtraciones y cómo protegerse.",
  },
  {
    name: "Hardware",
    slug: "hardware",
    description: "Procesadores, placas de video, celulares, computadoras y gadgets.",
  },
  {
    name: "Trabajo IT",
    slug: "trabajo-it",
    description: "Empleo, sueldos en dólares, freelance y carreras en tecnología.",
  },
] as const;
