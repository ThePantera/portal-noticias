import "server-only";
import { cacheLife } from "next/cache";
import { parseHolidays, type Holiday } from "@/lib/holidays";
import { buenosAiresDay } from "@/lib/views";

/**
 * Feriados de un año, de ArgentinaDatos. Se guardan en caché por días: el calendario cambia
 * muy pocas veces. Si la fuente falla, tira un error (que no queda en caché, así el próximo
 * pedido vuelve a probar) y la página muestra un aviso.
 */
async function fetchHolidays(year: number): Promise<Holiday[]> {
  "use cache";
  cacheLife("days");
  const response = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const holidays = parseHolidays(await response.json());
  if (!holidays) throw new Error("formato inesperado");
  return holidays;
}

/** Feriados del año, o null si la fuente no respondió. */
export async function getHolidays(year: number): Promise<Holiday[] | null> {
  try {
    return await fetchHolidays(year);
  } catch (error) {
    console.error(`Feriados ${year}: ArgentinaDatos no respondió bien`, error);
    return null;
  }
}

/**
 * Lo que muestra /feriados: el día de hoy (hora argentina) y los feriados de este año y del
 * siguiente (para el próximo feriado en diciembre). Se renueva cada hora.
 */
export async function getHolidayCalendar() {
  "use cache";
  cacheLife("hours");
  const today = buenosAiresDay(new Date());
  const year = Number(today.slice(0, 4));
  const [current, following] = await Promise.all([getHolidays(year), getHolidays(year + 1)]);
  return { today, year, current, following };
}
