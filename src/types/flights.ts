/** Vuelos en vivo de la página /vuelos. Las fechas viajan como texto ISO: las lee también el navegador. */

export type Flight = {
  /** Código ICAO de 24 bits del transpondedor, en hexadecimal ("e06443"). Estable mientras dura el vuelo. */
  id: string;
  /** Indicativo del vuelo ("ARG1540"), si el avión lo transmite. */
  callsign: string | null;
  /** Matrícula ("LV-FQC"). */
  registration: string | null;
  /** Código de modelo ICAO ("B738", "A320"). */
  model: string | null;
  lat: number;
  lon: number;
  /** Altitud barométrica en pies; null si no la informa. */
  altitudeFt: number | null;
  onGround: boolean;
  /** Velocidad sobre el suelo en nudos. */
  speedKt: number | null;
  /** Rumbo en grados (0 = norte, sentido horario). */
  heading: number | null;
};

export type FlightsSnapshot = {
  fetchedAt: string;
  flights: Flight[];
};
