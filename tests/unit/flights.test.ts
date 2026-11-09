import { describe, expect, it } from "vitest";
import {
  airlineFromCallsign,
  airlineName,
  flightLabel,
  formatAltitude,
  formatHeading,
  formatRouteAirport,
  formatSpeed,
  hasAirlineCallsign,
  parseAdsbLol,
  parseRouteset,
  routeCodes,
  sortFlights,
} from "@/lib/flights";

const sample = {
  ac: [
    {
      hex: "E06443",
      flight: "ARG1540 ",
      r: "LV-FQC",
      t: "B738",
      alt_baro: 34175,
      gs: 350.5,
      track: 309.09,
      lat: -34.1,
      lon: -58.9,
    },
    { hex: "e200f0", flight: "  ", r: "T-96", alt_baro: "ground", gs: 0, lat: -34.56, lon: -58.41 },
    { hex: "~1a2b3c", lat: -34.7, lon: -58.5, alt_baro: 1200 },
    { hex: "e0aaaa", alt_baro: 9000 },
    { hex: "e0bbbb", lat: "x", lon: -58.5 },
    { hex: "e06443", lat: -34.2, lon: -58.8 },
  ],
};

describe("vuelos: lectura de adsb.lol", () => {
  it("toma los aviones con posición, limpia textos y marca los que están en tierra", () => {
    const flights = parseAdsbLol(sample)!;
    expect(flights).toHaveLength(2);
    expect(flights[0]).toEqual({
      id: "e06443",
      callsign: "ARG1540",
      registration: "LV-FQC",
      model: "B738",
      lat: -34.1,
      lon: -58.9,
      altitudeFt: 34175,
      onGround: false,
      speedKt: 350.5,
      heading: 309.09,
      airline: { code: "ARG", name: "Aerolíneas Argentinas" },
      route: null,
    });
    expect(flights[1]).toMatchObject({
      id: "e200f0",
      callsign: null,
      onGround: true,
      altitudeFt: 0,
      model: null,
      airline: null,
    });
  });

  it("devuelve null si la respuesta no tiene la forma esperada", () => {
    expect(parseAdsbLol({ error: "rate limited" })).toBeNull();
    expect(parseAdsbLol(null)).toBeNull();
  });
});

describe("vuelos: formatos", () => {
  it("pasa pies a metros y nudos a km/h", () => {
    expect(formatAltitude({ altitudeFt: 35000, onGround: false })).toBe("10.668 m");
    expect(formatAltitude({ altitudeFt: 0, onGround: true })).toBe("En tierra");
    expect(formatAltitude({ altitudeFt: null, onGround: false })).toBe("Sin dato");
    expect(formatSpeed(450)).toBe("833 km/h");
    expect(formatSpeed(null)).toBe("Sin dato");
  });

  it("nombra el rumbo con el punto cardinal más cercano", () => {
    expect(formatHeading(0)).toBe("norte (0°)");
    expect(formatHeading(309.09)).toBe("noroeste (309°)");
    expect(formatHeading(-90)).toBe("oeste (270°)");
    expect(formatHeading(359)).toBe("norte (359°)");
    expect(formatHeading(null)).toBe("Sin dato");
  });

  it("muestra indicativo, si no matrícula, si no el código del transpondedor", () => {
    expect(flightLabel({ callsign: "ARG1540", registration: "LV-FQC", id: "e06443" })).toBe("ARG1540");
    expect(flightLabel({ callsign: null, registration: "LV-FQC", id: "e06443" })).toBe("LV-FQC");
    expect(flightLabel({ callsign: null, registration: null, id: "e06443" })).toBe("E06443");
  });

  it("ordena en el aire de más alto a más bajo y deja al final los que están en tierra", () => {
    const flights = parseAdsbLol({
      ac: [
        { hex: "a", lat: 0, lon: 0, alt_baro: "ground" },
        { hex: "b", lat: 0, lon: 0, alt_baro: 3000 },
        { hex: "c", lat: 0, lon: 0, alt_baro: 36000 },
        { hex: "d", lat: 0, lon: 0 },
      ],
    })!;
    expect(sortFlights(flights).map((f) => f.id)).toEqual(["c", "b", "d", "a"]);
  });
});

describe("vuelos: aerolínea y ruta", () => {
  it("deduce la aerolínea del indicativo y deja sin aerolínea a las matrículas", () => {
    expect(airlineFromCallsign("ARG1665")).toEqual({ code: "ARG", name: "Aerolíneas Argentinas" });
    expect(airlineFromCallsign("XYZ123")).toEqual({ code: "XYZ", name: null });
    expect(airlineName({ code: "XYZ", name: null })).toBe("Código XYZ");
    expect(airlineFromCallsign("LVCXS")).toBeNull();
    expect(airlineFromCallsign(null)).toBeNull();
    expect(hasAirlineCallsign("FBZ5150")).toBe(true);
    expect(hasAirlineCallsign("LVCXS")).toBe(false);
  });

  it("lee las rutas de adsb.lol y descarta las que no son plausibles", () => {
    const routes = parseRouteset([
      {
        callsign: "ARG1665",
        plausible: true,
        _airports: [
          { iata: "BRC", icao: "SAZS", location: "San Carlos de Bariloche", countryiso2: "AR" },
          { iata: "AEP", icao: "SABE", location: "Buenos Aires", countryiso2: "AR" },
        ],
      },
      {
        callsign: "LAN800",
        plausible: false,
        _airports: [
          { iata: "AKL", icao: "NZAA", location: "Auckland", countryiso2: "NZ" },
          { iata: "SCL", icao: "SCEL", location: "Santiago", countryiso2: "CL" },
        ],
      },
      { callsign: "FBZ1", plausible: true, _airports: [{ iata: "AEP", icao: "SABE" }] },
      { nada: true },
    ]);
    expect([...routes.keys()]).toEqual(["ARG1665"]);
    const route = routes.get("ARG1665")!;
    expect(formatRouteAirport(route[0])).toBe("San Carlos de Bariloche (BRC)");
    expect(routeCodes(route)).toBe("BRC → AEP");
    expect(parseRouteset({ error: "x" }).size).toBe(0);
  });

  it("usa el código ICAO cuando el aeropuerto no tiene IATA", () => {
    const routes = parseRouteset([
      {
        callsign: "ANS100",
        plausible: 1,
        _airports: [
          { iata: "", icao: "SADF", name: "San Fernando" },
          { iata: "MDQ", icao: "SAZM", location: "Mar del Plata", countryiso2: "AR" },
        ],
      },
    ]);
    expect(routeCodes(routes.get("ANS100")!)).toBe("SADF → MDQ");
    expect(formatRouteAirport(routes.get("ANS100")![0])).toBe("San Fernando (SADF)");
  });
});
