import { describe, expect, it } from "vitest";
import {
  flightLabel,
  formatAltitude,
  formatHeading,
  formatSpeed,
  parseAdsbLol,
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
    });
    expect(flights[1]).toMatchObject({
      id: "e200f0",
      callsign: null,
      onGround: true,
      altitudeFt: 0,
      model: null,
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
