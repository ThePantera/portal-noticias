/** Vuelos en vivo de la página /vuelos. Las fechas viajan como texto ISO: las lee también el navegador. */

/** Aeropuerto de una ruta, como lo informa la base de rutas de adsb.lol. */
export type RouteAirport = {
  /** Código IATA ("AEP"); algunos aeródromos chicos sólo tienen ICAO. */
  iata: string | null;
  icao: string;
  /** Ciudad ("Buenos Aires", "San Carlos de Bariloche"). */
  city: string;
  /** País en código ISO de dos letras ("AR"). */
  country: string;
};

export type Airline = {
  /** Código ICAO de la aerolínea ("ARG"), las tres letras del indicativo. */
  code: string;
  /** Nombre conocido ("Aerolíneas Argentinas"); null si no está en nuestra lista. */
  name: string | null;
};

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
  /** Aerolínea, deducida del indicativo; null en vuelos privados o militares sin código. */
  airline: Airline | null;
  /** Aeropuertos del vuelo, de origen a destino (con escalas en el medio); null si no se conoce. */
  route: RouteAirport[] | null;
};

export type FlightsSnapshot = {
  fetchedAt: string;
  flights: Flight[];
};
