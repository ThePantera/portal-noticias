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

/** "6 de octubre de 2026". */
export function formatDate(value: Date): string {
  return dateOnly.format(value);
}

/** Valor para el atributo datetime de <time>. */
export function toIsoString(value: Date): string {
  return value.toISOString();
}
