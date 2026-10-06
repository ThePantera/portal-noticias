/**
 * Notas de ejemplo para desarrollo. Son ficticias: no usar en producción.
 * Cubren todos los estados y varias categorías para probar portada, búsqueda y relacionadas.
 */
type DemoArticle = {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  paragraphs: string[];
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  hoursAgo?: number;
  scheduledInHours?: number;
  featuredRank?: number;
};

export const DEMO_ARTICLES: DemoArticle[] = [
  {
    title: "El Gobierno anuncia nuevas medidas económicas para contener la inflación",
    excerpt:
      "El paquete incluye cambios en el régimen de importaciones y precios de referencia por seis meses.",
    category: "economia",
    tags: ["Inflación", "Importaciones", "Precios"],
    paragraphs: [
      "El Ministerio de Economía presentó un conjunto de medidas que apuntan a desacelerar la suba de precios durante el último trimestre del año.",
      "Entre los cambios principales figura una reducción del plazo para el pago de importaciones de insumos productivos, de 60 a 30 días.",
      "Las cámaras empresarias pidieron conocer la letra chica de las resoluciones antes de opinar sobre su impacto.",
    ],
    status: "PUBLISHED",
    hoursAgo: 2,
    featuredRank: 1,
  },
  {
    title: "El Senado debate el presupuesto 2027 en una sesión que se extiende hasta la noche",
    excerpt: "El oficialismo consiguió quórum y espera votar el proyecto antes de la medianoche.",
    category: "politica",
    tags: ["Presupuesto", "Senado", "Congreso"],
    paragraphs: [
      "La sesión comenzó con más de cuarenta legisladores presentes y una lista de oradores que supera los cincuenta.",
      "La oposición adelantó que presentará cambios en el capítulo de transferencias a las provincias.",
    ],
    status: "PUBLISHED",
    hoursAgo: 3,
    featuredRank: 2,
  },
  {
    title: "Una empresa tecnológica presenta un teléfono con batería de mayor duración",
    excerpt: "El nuevo modelo promete dos días de uso con una sola carga.",
    category: "tecnologia",
    tags: ["Smartphones", "Baterías", "Lanzamientos"],
    paragraphs: [
      "El dispositivo incorpora una batería de silicio-carbono y un procesador de menor consumo.",
      "Llegará a las tiendas del país el mes próximo, con un precio todavía no confirmado.",
    ],
    status: "PUBLISHED",
    hoursAgo: 5,
    featuredRank: 3,
  },
  {
    title: "La cumbre climática cierra sin acuerdo sobre financiamiento",
    excerpt: "Los países no lograron consensuar un fondo para la adaptación de las naciones más vulnerables.",
    category: "mundo",
    tags: ["Cambio climático", "Diplomacia"],
    paragraphs: [
      "Tras dos semanas de negociaciones, el documento final omitió las cifras que reclamaban los países en desarrollo.",
      "Las delegaciones volverán a reunirse en seis meses para retomar la discusión.",
    ],
    status: "PUBLISHED",
    hoursAgo: 14,
  },
  {
    title: "Investigadores secuencian el genoma completo de una especie de yaguareté",
    excerpt: "El trabajo abre la puerta a programas de conservación más precisos.",
    category: "ciencia",
    tags: ["Genética", "Conservación", "Fauna"],
    paragraphs: [
      "El equipo trabajó durante tres años con muestras de ejemplares de distintas reservas.",
      "Los datos permitirán evaluar la diversidad genética de las poblaciones que quedan en estado silvestre.",
    ],
    status: "PUBLISHED",
    hoursAgo: 20,
  },
  {
    title: "La selección confirma la lista para las eliminatorias",
    excerpt: "Vuelven dos titulares y debuta un juvenil de 19 años.",
    category: "deportes",
    tags: ["Fútbol", "Selección", "Eliminatorias"],
    paragraphs: [
      "El cuerpo técnico dio a conocer los 26 convocados para la doble fecha.",
      "El plantel se concentrará desde el lunes en el predio de entrenamiento.",
    ],
    status: "PUBLISHED",
    hoursAgo: 26,
  },
  {
    title: "Abre la feria del libro con récord de editoriales independientes",
    excerpt: "Más de 300 sellos participan este año.",
    category: "cultura",
    tags: ["Libros", "Ferias", "Editoriales"],
    paragraphs: [
      "La organización destacó el crecimiento de los sellos pequeños, que ocupan un pabellón completo.",
      "La entrada será gratuita los días de semana hasta las 14.",
    ],
    status: "PUBLISHED",
    hoursAgo: 30,
  },
  {
    title: "Alerta amarilla por tormentas fuertes en el litoral",
    excerpt: "Se esperan lluvias intensas, ráfagas y caída de granizo.",
    category: "sociedad",
    tags: ["Clima", "Alertas"],
    paragraphs: [
      "El servicio meteorológico emitió la alerta para cinco provincias hasta la madrugada del jueves.",
      "Las autoridades recomendaron evitar salir durante las horas de mayor intensidad.",
    ],
    status: "PUBLISHED",
    hoursAgo: 8,
  },
  {
    title: "Detienen a una banda dedicada al robo de autopartes",
    excerpt: "La investigación incluyó doce allanamientos simultáneos.",
    category: "seguridad",
    tags: ["Robos", "Allanamientos"],
    paragraphs: [
      "Los investigadores secuestraron más de 400 piezas y tres vehículos.",
      "Los detenidos quedaron a disposición de la justicia.",
    ],
    status: "PUBLISHED",
    hoursAgo: 40,
  },
  {
    title: "Por qué todos hablan del nuevo juego de palabras que se volvió viral",
    excerpt: "Un desafío diario que ya suma millones de jugadores.",
    category: "tendencias",
    tags: ["Redes sociales", "Juegos"],
    paragraphs: ["La propuesta es simple: adivinar una palabra en seis intentos, con una pista por día."],
    status: "PUBLISHED",
    hoursAgo: 50,
  },
  {
    title: "Borrador: análisis de la reforma previsional",
    excerpt: "Pendiente de revisión.",
    category: "politica",
    tags: ["Jubilaciones"],
    paragraphs: ["Texto en preparación."],
    status: "DRAFT",
  },
  {
    title: "Programada: resultados del censo económico",
    excerpt: "Se publica cuando se levante el embargo.",
    category: "economia",
    tags: ["Estadísticas"],
    paragraphs: ["Los resultados se conocerán en la conferencia de prensa."],
    status: "SCHEDULED",
    scheduledInHours: 48,
  },
  {
    title: "Archivada: cronograma de vacunación del invierno pasado",
    excerpt: "Información ya no vigente.",
    category: "sociedad",
    tags: ["Salud"],
    paragraphs: ["El cronograma rigió entre mayo y agosto."],
    status: "ARCHIVED",
    hoursAgo: 2000,
  },
];
