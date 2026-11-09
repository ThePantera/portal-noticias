"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/dates";
import {
  AIRPORTS,
  FLIGHTS_CENTER,
  FLIGHTS_SOURCE,
  airlineName,
  flightLabel,
  formatAltitude,
  formatHeading,
  formatRouteAirport,
  formatSpeed,
  routeCodes,
  sortFlights,
  type Airport,
} from "@/lib/flights";
import type { Flight, FlightsSnapshot } from "@/types/flights";
import { useFlights } from "./useFlights";
import { routeOf, useRoute, type RouteState } from "./useRoutes";

/*
 * Mapa con Leaflet, cargado desde unpkg con versión fija y hash de integridad: sólo lo baja
 * quien entra a /vuelos y no suma dependencias al proyecto. Las teselas son de OpenStreetMap
 * (con su atribución) y se tiñen con CSS para que combinen con el papel del diario.
 */
const LEAFLET_VERSION = "1.9.4";
const LEAFLET_JS = {
  src: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`,
  integrity: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
};
const LEAFLET_CSS = {
  href: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
  integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
};

type LatLng = [number, number];
type LeafletIcon = { readonly __icon: true };
type LeafletMarker = {
  setLatLng(position: LatLng): LeafletMarker;
  setIcon(icon: LeafletIcon): LeafletMarker;
  setZIndexOffset(offset: number): LeafletMarker;
  addTo(map: LeafletMap): LeafletMarker;
  on(event: "click", handler: () => void): LeafletMarker;
  remove(): void;
};
type LeafletMap = { remove(): void; panTo(position: LatLng): LeafletMap };
type Leaflet = {
  map(element: HTMLElement, options: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, options: Record<string, unknown>): { addTo(map: LeafletMap): unknown };
  marker(position: LatLng, options: Record<string, unknown>): LeafletMarker;
  divIcon(options: Record<string, unknown>): LeafletIcon;
};

/** Referencia estable para "sin datos todavía": evita rehacer los marcadores en cada render. */
const NO_FLIGHTS: Flight[] = [];

let leafletPromise: Promise<Leaflet> | null = null;

function loadLeaflet(): Promise<Leaflet> {
  const existing = (window as unknown as { L?: Leaflet }).L;
  if (existing) return Promise.resolve(existing);
  leafletPromise ??= new Promise<Leaflet>((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = LEAFLET_CSS.href;
    css.integrity = LEAFLET_CSS.integrity;
    css.crossOrigin = "anonymous";
    document.head.append(css);
    const script = document.createElement("script");
    script.src = LEAFLET_JS.src;
    script.integrity = LEAFLET_JS.integrity;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = () => {
      const leaflet = (window as unknown as { L?: Leaflet }).L;
      if (leaflet) resolve(leaflet);
      else reject(new Error("Leaflet no quedó disponible"));
    };
    script.onerror = () => {
      leafletPromise = null;
      script.remove();
      reject(new Error("No se pudo cargar Leaflet"));
    };
    document.head.append(script);
  });
  return leafletPromise;
}

/** Silueta de avión mirando al norte; se gira con el rumbo. */
const PLANE_PATH =
  "M12 1.5c.9 0 1.5.8 1.5 1.8v5.9l8 4.9v2.2l-8-2.5v5l2.3 1.8v1.6L12 21.4l-3.8.8v-1.6l2.3-1.8v-5l-8 2.5v-2.2l8-4.9V3.3c0-1 .6-1.8 1.5-1.8z";

function planeIcon(leaflet: Leaflet, flight: Flight, selected: boolean): LeafletIcon {
  const rotation = Math.round(flight.heading ?? 0);
  const state = selected ? "selected" : flight.onGround ? "ground" : "air";
  return leaflet.divIcon({
    className: "flight-marker",
    html: `<span class="flight-icon" data-state="${state}" style="transform:rotate(${rotation}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${PLANE_PATH}"/></svg></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Vuelos: <a href="https://adsb.lol">adsb.lol</a> (ODbL)';

function airportIcon(leaflet: Leaflet, airport: Airport): LeafletIcon {
  return leaflet.divIcon({
    className: "airport-marker",
    html: `<span class="airport-label" title="${airport.name}">${airport.code}</span>`,
    iconSize: [36, 18],
    iconAnchor: [18, 9],
  });
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs tracking-widest text-ink-subtle uppercase">{label}</dt>
      <dd className="font-mono text-sm text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function RouteBlock({ route }: { route: RouteState | undefined }) {
  if (route === "loading" || route === undefined) {
    return <p className="text-sm text-ink-muted">Buscando de dónde sale y adónde va…</p>;
  }
  if (route === "unknown") {
    return <p className="text-sm text-ink-muted">Sin datos de origen y destino para este vuelo.</p>;
  }
  const origin = route[0];
  const destination = route[route.length - 1];
  const stops = route.slice(1, -1);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-rule py-3">
      <div className="grid gap-0.5">
        <dt className="text-xs tracking-widest text-ink-subtle uppercase">Sale de</dt>
        <dd className="font-display text-lg leading-tight font-bold">{formatRouteAirport(origin)}</dd>
      </div>
      <div className="grid gap-0.5">
        <dt className="text-xs tracking-widest text-ink-subtle uppercase">Va a</dt>
        <dd className="font-display text-lg leading-tight font-bold">{formatRouteAirport(destination)}</dd>
      </div>
      {stops.length > 0 ? (
        <div className="col-span-2 grid gap-0.5">
          <dt className="text-xs tracking-widest text-ink-subtle uppercase">Escalas</dt>
          <dd className="text-sm text-ink">{stops.map(formatRouteAirport).join(", ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function FlightCard({ flight, onClose }: { flight: Flight | null; onClose: () => void }) {
  const route = useRoute(flight);
  if (!flight) {
    return (
      <p className="border border-rule bg-surface p-4 text-sm text-ink-muted">
        Tocá un avión en el mapa o en la lista para ver de dónde viene, adónde va y con qué aerolínea.
      </p>
    );
  }
  return (
    <section
      aria-label={`Vuelo ${flightLabel(flight)}`}
      className="grid gap-4 border border-ink bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-widest text-ink-subtle uppercase">Vuelo seleccionado</p>
          <h2 className="font-display text-2xl font-extrabold">{flightLabel(flight)}</h2>
          {flight.airline ? <p className="text-sm text-ink-muted">{airlineName(flight.airline)}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-rule px-2 py-1 text-xs tracking-widest uppercase hover:bg-surface-muted"
        >
          Cerrar
        </button>
      </div>
      <RouteBlock route={route} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Detail label="Altura" value={formatAltitude(flight)} />
        <Detail label="Velocidad" value={formatSpeed(flight.speedKt)} />
        <Detail label="Rumbo" value={formatHeading(flight.heading)} />
        <Detail label="Avión" value={flight.model ?? "Sin dato"} />
        <Detail label="Matrícula" value={flight.registration ?? "Sin dato"} />
        <Detail label="Transpondedor" value={flight.id.toUpperCase()} />
      </dl>
      <a
        href={`https://globe.adsb.lol/?icao=${encodeURIComponent(flight.id)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm underline underline-offset-4"
      >
        Ver recorrido completo en adsb.lol
      </a>
    </section>
  );
}

/** "BRC → AEP · 10.668 m": la ruta si se conoce, si no el modelo, y la altura. */
function listDetail(flight: Flight): string {
  const route = routeOf(flight);
  const lead = Array.isArray(route) ? routeCodes(route) : flight.model;
  return lead ? `${lead} · ${formatAltitude(flight)}` : formatAltitude(flight);
}

function statusLine(status: "loading" | "ok" | "error", snapshot: FlightsSnapshot | null): string {
  if (status === "error") return "No pudimos traer los vuelos. Se vuelve a intentar sola en unos segundos.";
  if (!snapshot) return "Buscando aviones en el cielo…";
  const airborne = snapshot.flights.filter((flight) => !flight.onGround).length;
  const ground = snapshot.flights.length - airborne;
  const time = formatTime(new Date(snapshot.fetchedAt));
  return `${airborne} aviones en el aire y ${ground} en tierra · actualizado a las ${time}`;
}

/** Mapa de vuelos en vivo sobre Buenos Aires, con la ficha del avión elegido y la lista completa. */
export function FlightsTracker() {
  const { snapshot, status } = useFlights();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, LeafletMarker>());
  const latest = useRef({ flights: [] as Flight[], selectedId: null as string | null });

  const flights = snapshot?.flights ?? NO_FLIGHTS;
  const selected = flights.find((flight) => flight.id === selectedId) ?? null;

  /** Lleva los marcadores a las posiciones de la última respuesta. */
  function syncMarkers() {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!leaflet || !map) return;
    const { flights: current, selectedId: chosen } = latest.current;
    const alive = new Set<string>();
    for (const flight of current) {
      alive.add(flight.id);
      const isSelected = flight.id === chosen;
      const icon = planeIcon(leaflet, flight, isSelected);
      const position: LatLng = [flight.lat, flight.lon];
      const marker = markers.current.get(flight.id);
      if (marker) {
        const zIndex = isSelected ? 1000 : 0;
        marker.setLatLng(position).setIcon(icon).setZIndexOffset(zIndex);
      } else {
        const created = leaflet
          .marker(position, { icon, keyboard: false, zIndexOffset: isSelected ? 1000 : 0 })
          .on("click", () => setSelectedId(flight.id))
          .addTo(map);
        markers.current.set(flight.id, created);
      }
    }
    for (const [id, marker] of markers.current) {
      if (!alive.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const markerMap = markers.current;
    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !container.current) return;
        const map = leaflet.map(container.current, {
          center: [FLIGHTS_CENTER.lat, FLIGHTS_CENTER.lon],
          zoom: window.innerWidth < 640 ? 7 : 8,
          minZoom: 5,
          maxZoom: 13,
          zoomSnap: 0.5,
        });
        leaflet.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_CREDIT }).addTo(map);
        for (const airport of AIRPORTS) {
          const options = { icon: airportIcon(leaflet, airport), keyboard: false, interactive: false };
          leaflet.marker([airport.lat, airport.lon], { ...options, zIndexOffset: -1000 }).addTo(map);
        }
        leafletRef.current = leaflet;
        mapRef.current = map;
        syncMarkers();
      })
      .catch(() => {
        if (!cancelled) setMapFailed(true);
      });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerMap.clear();
    };
    // Se arma una sola vez; los datos llegan después por syncMarkers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    latest.current = { flights, selectedId };
    syncMarkers();
    // syncMarkers sólo lee refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights, selectedId]);

  const sorted = sortFlights(flights);

  /** Desde la lista: centra el mapa en el avión y acerca la ficha a la vista. */
  function chooseFromList(flight: Flight) {
    setSelectedId(flight.id);
    mapRef.current?.panTo([flight.lat, flight.lon]);
    details.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        {status === "ok" ? <span aria-hidden="true" className="live-dot" /> : null}
        {statusLine(status, snapshot)}
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative">
          <div
            ref={container}
            role="region"
            aria-label="Mapa de vuelos sobre Buenos Aires"
            className="flights-map h-[62vh] max-h-[40rem] min-h-[22rem] w-full border border-ink"
          />
          {mapFailed ? (
            <p className="absolute inset-x-4 top-4 border border-ink bg-surface p-3 text-sm">
              El mapa no cargó. La lista de vuelos de abajo sigue actualizándose.
            </p>
          ) : null}
        </div>
        <div ref={details} className="grid content-start gap-4">
          <FlightCard flight={selected} onClose={() => setSelectedId(null)} />
          <p className="text-xs text-ink-subtle">
            Posiciones de la red abierta de receptores adsb.lol, con licencia ODbL, en un radio de 460 km.
            Algunos aviones no transmiten su posición y no aparecen.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href={FLIGHTS_SOURCE.url} className="underline" target="_blank" rel="noopener noreferrer">
              Datos de adsb.lol
            </a>
            <a
              href={FLIGHTS_SOURCE.licenseUrl}
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Licencia ODbL
            </a>
          </p>
        </div>
      </div>

      {sorted.length > 0 ? (
        <section aria-labelledby="flights-list" className="grid gap-3">
          <h2 id="flights-list" className="border-b border-ink pb-1 font-display text-xl font-extrabold">
            Todos los vuelos a la vista
          </h2>
          <ul className="grid grid-cols-1 border-t border-rule min-[480px]:grid-cols-2 lg:grid-cols-4">
            {sorted.map((flight) => (
              <li key={flight.id} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => chooseFromList(flight)}
                  aria-pressed={flight.id === selectedId}
                  className={`flex w-full items-baseline justify-between gap-3 px-2 py-2 text-left text-sm ${flight.id === selectedId ? "bg-signal text-on-signal" : "hover:bg-surface-muted"}`}
                >
                  <span className="font-semibold">{flightLabel(flight)}</span>
                  <span className="font-mono text-xs tabular-nums">{listDetail(flight)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
