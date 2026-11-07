/**
 * Horóscopo del día. No hay una fuente libre y confiable, así que el texto se arma acá:
 * para cada signo y cada día (en hora de Buenos Aires) se eligen frases de un banco propio
 * con un generador pseudoaleatorio sembrado con la fecha y el signo. Mismo día y mismo
 * signo dan siempre el mismo texto; sin IA en tiempo real ni textos de terceros.
 * Es contenido de entretenimiento.
 */

export type ZodiacElement = "fuego" | "tierra" | "aire" | "agua";

export type ZodiacSign = {
  /** Identificador estable y ancla de la página (/horoscopo#aries). */
  slug: string;
  name: string;
  emoji: string;
  element: ZodiacElement;
  /** "21 de marzo al 19 de abril". */
  dates: string;
};

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  {
    slug: "aries",
    name: "Aries",
    emoji: "♈",
    element: "fuego",
    dates: "21 de marzo al 19 de abril",
  },
  {
    slug: "tauro",
    name: "Tauro",
    emoji: "♉",
    element: "tierra",
    dates: "20 de abril al 20 de mayo",
  },
  {
    slug: "geminis",
    name: "Géminis",
    emoji: "♊",
    element: "aire",
    dates: "21 de mayo al 20 de junio",
  },
  {
    slug: "cancer",
    name: "Cáncer",
    emoji: "♋",
    element: "agua",
    dates: "21 de junio al 22 de julio",
  },
  {
    slug: "leo",
    name: "Leo",
    emoji: "♌",
    element: "fuego",
    dates: "23 de julio al 22 de agosto",
  },
  {
    slug: "virgo",
    name: "Virgo",
    emoji: "♍",
    element: "tierra",
    dates: "23 de agosto al 22 de septiembre",
  },
  {
    slug: "libra",
    name: "Libra",
    emoji: "♎",
    element: "aire",
    dates: "23 de septiembre al 22 de octubre",
  },
  {
    slug: "escorpio",
    name: "Escorpio",
    emoji: "♏",
    element: "agua",
    dates: "23 de octubre al 21 de noviembre",
  },
  {
    slug: "sagitario",
    name: "Sagitario",
    emoji: "♐",
    element: "fuego",
    dates: "22 de noviembre al 21 de diciembre",
  },
  {
    slug: "capricornio",
    name: "Capricornio",
    emoji: "♑",
    element: "tierra",
    dates: "22 de diciembre al 19 de enero",
  },
  {
    slug: "acuario",
    name: "Acuario",
    emoji: "♒",
    element: "aire",
    dates: "20 de enero al 18 de febrero",
  },
  {
    slug: "piscis",
    name: "Piscis",
    emoji: "♓",
    element: "agua",
    dates: "19 de febrero al 20 de marzo",
  },
];

export const ELEMENT_LABEL: Record<ZodiacElement, string> = {
  fuego: "Fuego",
  tierra: "Tierra",
  aire: "Aire",
  agua: "Agua",
};

const LOVE = [
  "Una charla sin apuro con alguien cercano aclara más de lo que esperabas.",
  "Si hay algo que venís postergando decir, hoy encontrás las palabras justas.",
  "Un mensaje inesperado te saca una sonrisa a media tarde.",
  "Conviene escuchar más y suponer menos: el otro también tiene su día.",
  "Un gesto chico, como un mate compartido, vale más que una gran promesa.",
  "La paciencia juega a tu favor; no hace falta resolver todo hoy.",
  "Alguien de tu entorno te mira con otros ojos. Prestá atención.",
  "Buen día para planear una salida sencilla con quien te hace bien.",
  "Si estás en pareja, un recuerdo compartido los vuelve a acercar.",
  "Si estás solo o sola, una conversación casual puede tener segunda parte.",
  "Evitá discusiones por detalles: no vale la pena gastar energía ahí.",
  "Tu buen humor es contagioso y alguien lo va a notar.",
];

const WORK = [
  "Ordenar la lista de pendientes te devuelve el control de la jornada.",
  "Una idea que parecía menor puede destrabar un problema del equipo.",
  "Revisá dos veces antes de enviar: un detalle hace la diferencia.",
  "Es buen momento para pedir esa reunión que venías dejando para después.",
  "No te cargues con tareas ajenas; aprender a decir que no también es trabajo.",
  "Un contacto viejo puede traer una propuesta interesante.",
  "Terminar una cosa por vez rinde más que empezar varias.",
  "Tu experiencia vale: compartila sin miedo en la próxima conversación.",
  "Las cuentas piden atención; un repaso de gastos te deja más tranquilo.",
  "Un cambio de rutina, aunque sea chico, te despeja la cabeza.",
  "Hoy conviene escuchar antes de opinar en las decisiones importantes.",
  "Un reconocimiento llega cuando menos lo esperás.",
];

const HEALTH = [
  "Una caminata corta al aire libre te cambia el ánimo.",
  "Tomá más agua y dale un descanso a la pantalla cada tanto.",
  "Dormir bien esta noche es la mejor inversión para mañana.",
  "Estirar la espalda unos minutos te va a venir muy bien.",
  "Comé tranquilo y sin apuro: el cuerpo lo agradece.",
  "Bajar un cambio a media tarde te ayuda a llegar entero a la noche.",
  "Un rato de música o de lectura te recarga la energía.",
  "Escuchá a tu cuerpo: si pide pausa, dásela.",
  "Moverte un poco más de lo habitual te deja de mejor humor.",
  "Dejá el celular lejos de la cama y vas a descansar mejor.",
];

const COLORS = [
  "rojo",
  "naranja",
  "amarillo",
  "verde",
  "turquesa",
  "celeste",
  "azul",
  "violeta",
  "rosa",
  "blanco",
  "gris",
  "dorado",
  "plateado",
  "bordó",
];

export type DailyHoroscope = {
  sign: ZodiacSign;
  love: string;
  work: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
};

/** Hash FNV-1a de 32 bits: misma cadena, mismo número. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Generador mulberry32: chico, rápido y determinístico a partir de la semilla. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** El horóscopo de un signo para un día ("2026-11-07", fecha de Buenos Aires). */
export function dailyHoroscope(sign: ZodiacSign, day: string): DailyHoroscope {
  const random = seededRandom(hashString(`${day}|${sign.slug}`));
  return {
    sign,
    love: pick(LOVE, random),
    work: pick(WORK, random),
    health: pick(HEALTH, random),
    luckyNumber: 1 + Math.floor(random() * 99),
    luckyColor: pick(COLORS, random),
  };
}

/** Los doce signos para un día, en el orden del zodíaco. */
export function dailyHoroscopes(day: string): DailyHoroscope[] {
  return ZODIAC_SIGNS.map((sign) => dailyHoroscope(sign, day));
}
