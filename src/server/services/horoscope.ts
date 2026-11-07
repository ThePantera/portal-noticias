import "server-only";
import { cacheLife } from "next/cache";
import { dailyHoroscopes } from "@/lib/horoscope";
import { buenosAiresDay } from "@/lib/views";

/**
 * Lo que muestra /horoscopo: el día de hoy (hora argentina) y el texto de cada signo. El
 * texto sale de src/lib/horoscope.ts y es fijo para cada fecha; la caché corta (minutos)
 * sólo sirve para que el cambio de día se vea enseguida después de medianoche.
 */
export async function getTodayHoroscopes() {
  "use cache";
  cacheLife("minutes");
  const today = buenosAiresDay(new Date());
  return { today, horoscopes: dailyHoroscopes(today) };
}
