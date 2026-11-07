/**
 * Clima de las principales ciudades. Los datos salen de Open-Meteo (open-meteo.com, licencia
 * CC BY 4.0: hay que citar "Datos: Open-Meteo"); acá sólo se arma el pedido y se lee la
 * respuesta.
 */

export type City = { id: string; name: string; latitude: number; longitude: number };

export type DailyForecast = { date: string; code: number; max: number; min: number };

export type CityWeather = {
  city: City;
  /** Hora local de la medición, "2026-11-07T14:15". */
  observedAt: string;
  temperature: number;
  code: number;
  isDay: boolean;
  /** El primero es hoy (hora argentina). */
  daily: DailyForecast[];
};

export type WeatherCondition = { label: string; icon: string };

export const WEATHER_SOURCE = { name: "Open-Meteo", url: "https://open-meteo.com/" };

/** Buenos Aires va primero: es la que la portada muestra grande. */
export const CITIES: City[] = [
  { id: "buenos-aires", name: "Buenos Aires", latitude: -34.6037, longitude: -58.3816 },
  { id: "cordoba", name: "Córdoba", latitude: -31.4201, longitude: -64.1888 },
  { id: "rosario", name: "Rosario", latitude: -32.9442, longitude: -60.6505 },
  { id: "mendoza", name: "Mendoza", latitude: -32.8895, longitude: -68.8458 },
  { id: "la-plata", name: "La Plata", latitude: -34.9214, longitude: -57.9545 },
  { id: "mar-del-plata", name: "Mar del Plata", latitude: -38.0055, longitude: -57.5426 },
  { id: "salta", name: "Salta", latitude: -24.7821, longitude: -65.4232 },
  { id: "tucuman", name: "Tucumán", latitude: -26.8083, longitude: -65.2176 },
  { id: "neuquen", name: "Neuquén", latitude: -38.9516, longitude: -68.0591 },
  { id: "bariloche", name: "Bariloche", latitude: -41.1335, longitude: -71.3103 },
  { id: "ushuaia", name: "Ushuaia", latitude: -54.8019, longitude: -68.303 },
];

/** Las que acompañan a Buenos Aires en el recuadro de la portada. */
export const HOME_CITY_IDS = ["cordoba", "rosario", "mendoza", "mar-del-plata"];

export const FORECAST_DAYS = 5;

/** Un solo pedido para todas las ciudades: latitude y longitude aceptan listas separadas por coma. */
export function openMeteoUrl(cities: City[] = CITIES): string {
  const params = new URLSearchParams({
    latitude: cities.map((c) => c.latitude).join(","),
    longitude: cities.map((c) => c.longitude).join(","),
    current: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "America/Argentina/Buenos_Aires",
    forecast_days: String(FORECAST_DAYS),
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseDaily(value: unknown): DailyForecast[] {
  const daily = record(value);
  if (!daily) return [];
  const { time, weather_code: codes, temperature_2m_max: maxes, temperature_2m_min: mins } = daily;
  if (!Array.isArray(time) || !Array.isArray(codes) || !Array.isArray(maxes) || !Array.isArray(mins)) {
    return [];
  }
  const days: DailyForecast[] = [];
  time.forEach((date, i) => {
    const [code, max, min] = [codes[i], maxes[i], mins[i]];
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (!isNumber(code) || !isNumber(max) || !isNumber(min)) return;
    days.push({ date, code, max, min });
  });
  return days;
}

function parseLocation(value: unknown, city: City): CityWeather | null {
  const location = record(value);
  const current = record(location?.current);
  if (!current) return null;
  const { time, temperature_2m: temperature, weather_code: code, is_day: isDay } = current;
  if (typeof time !== "string" || !isNumber(temperature) || !isNumber(code)) return null;
  const daily = parseDaily(location?.daily);
  if (daily.length === 0) return null;
  return { city, observedAt: time, temperature, code, isDay: isDay !== 0, daily };
}

/**
 * Lee /v1/forecast. Con varias coordenadas la respuesta es una lista, una por ciudad y en el
 * mismo orden del pedido (si trae `location_id`, se usa ese índice); con una sola es un objeto.
 * Las coordenadas que devuelve están corridas a la grilla del modelo, así que no sirven para
 * reconocer la ciudad. Se descarta lo que no tenga la forma esperada; null si no queda nada.
 */
export function parseOpenMeteo(json: unknown, cities: City[] = CITIES): CityWeather[] | null {
  const locations = Array.isArray(json) ? json : [json];
  const result: CityWeather[] = [];
  locations.forEach((location, i) => {
    const id = record(location)?.location_id;
    const city = cities[isNumber(id) ? id : i];
    if (!city || result.some((r) => r.city.id === city.id)) return;
    const weather = parseLocation(location, city);
    if (weather) result.push(weather);
  });
  if (result.length === 0) return null;
  const order = (w: CityWeather) => cities.indexOf(w.city);
  return result.sort((a, b) => order(a) - order(b));
}

/** Códigos WMO que usa Open-Meteo, en castellano y con un emoji. */
const CONDITIONS: Record<number, WeatherCondition> = {
  0: { label: "Despejado", icon: "☀️" },
  1: { label: "Mayormente despejado", icon: "🌤️" },
  2: { label: "Parcialmente nublado", icon: "⛅" },
  3: { label: "Nublado", icon: "☁️" },
  45: { label: "Niebla", icon: "🌫️" },
  48: { label: "Niebla con escarcha", icon: "🌫️" },
  51: { label: "Llovizna débil", icon: "🌦️" },
  53: { label: "Llovizna", icon: "🌦️" },
  55: { label: "Llovizna intensa", icon: "🌧️" },
  56: { label: "Llovizna helada", icon: "🌧️" },
  57: { label: "Llovizna helada intensa", icon: "🌧️" },
  61: { label: "Lluvia débil", icon: "🌦️" },
  63: { label: "Lluvia", icon: "🌧️" },
  65: { label: "Lluvia intensa", icon: "🌧️" },
  66: { label: "Lluvia helada", icon: "🌧️" },
  67: { label: "Lluvia helada intensa", icon: "🌧️" },
  71: { label: "Nevada débil", icon: "🌨️" },
  73: { label: "Nevada", icon: "🌨️" },
  75: { label: "Nevada intensa", icon: "❄️" },
  77: { label: "Granizo fino", icon: "🌨️" },
  80: { label: "Chaparrones débiles", icon: "🌦️" },
  81: { label: "Chaparrones", icon: "🌧️" },
  82: { label: "Chaparrones fuertes", icon: "🌧️" },
  85: { label: "Chaparrones de nieve", icon: "🌨️" },
  86: { label: "Chaparrones de nieve fuertes", icon: "❄️" },
  95: { label: "Tormenta", icon: "⛈️" },
  96: { label: "Tormenta con granizo", icon: "⛈️" },
  99: { label: "Tormenta con granizo fuerte", icon: "⛈️" },
};

/** Texto e ícono de un código WMO. De noche, el cielo despejado lleva luna en vez de sol. */
export function describeWeather(code: number, isDay = true): WeatherCondition {
  const condition = CONDITIONS[code] ?? { label: "Sin datos", icon: "🌡️" };
  if (!isDay && code === 0) return { ...condition, icon: "🌙" };
  if (!isDay && code === 1) return { ...condition, icon: "🌙" };
  return condition;
}

/** "23°", "-2°" (sin "-0°"). */
export function formatTemperature(value: number): string {
  return `${Math.round(value) || 0}°`;
}

/** "14:15", de la hora local que devuelve Open-Meteo ("2026-11-07T14:15"). */
export function formatObservedTime(time: string): string {
  return time.slice(11, 16);
}

const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" });

/** "domingo 8". La fecha no tiene hora: se formatea en UTC para no correrla de día. */
export function formatForecastDay(date: string): string {
  return `${weekday.format(new Date(`${date}T00:00:00Z`))} ${Number(date.slice(8, 10))}`;
}
