const TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  // es-AR resuelve a reloj de 12 horas en ICU ("11:30 a. m."); la prensa
  // argentina escribe 24 horas. h23 lo fija sin depender del build de Node.
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const dateOnly = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** "06/10/2026, 11:30". Se formatea en el servidor, siempre en la zona horaria del portal. */
export function formatDateTime(value: Date): string {
  return dateTime.format(value);
}

const timeOnly = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

/** "11:30", en hora de Buenos Aires. */
export function formatTime(value: Date): string {
  return timeOnly.format(value);
}

const dayMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: TIME_ZONE });

/** "6 oct", para listas donde la hora ya dice casi todo. */
export function formatDayMonth(value: Date): string {
  return dayMonth.format(value).replace(/\.$/, "");
}

/** "6 de octubre de 2026". */
export function formatDate(value: Date): string {
  return dateOnly.format(value);
}

/** Valor para el atributo datetime de <time>. */
export function toIsoString(value: Date): string {
  return value.toISOString();
}

const parts = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

/** Fecha y hora de pared en la zona del portal, como pide `<input type="datetime-local">`: "2026-10-07T09:30". */
export function toDateTimeInputValue(value: Date): string {
  const p = Object.fromEntries(parts.formatToParts(value).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const DATETIME_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Interpreta "2026-10-07T09:30" como hora de Buenos Aires, sin importar la zona del
 * servidor (Vercel corre en UTC). Devuelve null si el texto no es una fecha válida.
 */
export function parseDateTimeInput(value: string): Date | null {
  const match = DATETIME_LOCAL.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Corrimiento de la zona en ese instante; se recalcula una vez por si cae en un cambio de horario.
  let guess = asUtc - offsetMs(new Date(asUtc));
  guess = asUtc - offsetMs(new Date(guess));
  const result = new Date(guess);
  // Rechaza fechas imposibles como 31/02, que Date.UTC acomoda en silencio.
  return toDateTimeInputValue(result) === value.trim() ? result : null;
}

function offsetMs(instant: Date): number {
  const p = Object.fromEntries(parts.formatToParts(instant).map((part) => [part.type, Number(part.value)]));
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(instant.getTime() / 60_000) * 60_000
  );
}
