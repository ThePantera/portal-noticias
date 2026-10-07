"use client";

import { useEffect, useRef, useState } from "react";
import { type DiceFace, diceVerdict, faceFromRandom } from "@/lib/market-format";

type Asset = { id: string; name: string };
type Result = { asset: string; face: DiceFace; verdict: "sube" | "baja" };

const RANDOM = "azar";
const ROLL_MS = 1200;

/** Giro del cubo que deja cada cara al frente (ver .dice-face en globals.css). */
const FACE_ROTATION: Record<DiceFace, [x: number, y: number]> = {
  1: [0, 0],
  2: [90, 0],
  3: [0, -90],
  4: [0, 90],
  5: [-90, 0],
  6: [0, 180],
};

/** Posición de los puntos de cada cara en una grilla de 3 × 3 (0 arriba a la izquierda). */
const PIPS: Record<DiceFace, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACES: DiceFace[] = [1, 2, 3, 4, 5, 6];

/** Siguiente giro: dos vueltas completas más la cara que salió, siempre hacia adelante. */
function nextRotation(current: { x: number; y: number }, face: DiceFace) {
  const [fx, fy] = FACE_ROTATION[face];
  const turn = (value: number) => Math.ceil(value / 360) * 360 + 720;
  return { x: turn(current.x) + fx, y: turn(current.y) + fy };
}

/**
 * Dado de la suerte: se elige un índice o una moneda (o "al azar"), se tira y dice si "sube"
 * o "baja". Es un juego: el resultado sale de Math.random y no mira ningún dato del mercado.
 */
export function LuckyDice({ assets }: { assets: Asset[] }) {
  const [choice, setChoice] = useState(RANDOM);
  const [rotation, setRotation] = useState({ x: -20, y: 25 });
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function roll() {
    if (rolling || assets.length === 0) return;
    const face = faceFromRandom(Math.random());
    const asset =
      choice === RANDOM
        ? assets[Math.floor(Math.random() * assets.length)]!
        : (assets.find((a) => a.id === choice) ?? assets[0]!);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRolling(true);
    setResult(null);
    setRotation((current) => nextRotation(current, face));
    timer.current = setTimeout(
      () => {
        setRolling(false);
        setResult({ asset: asset.name, face, verdict: diceVerdict(face) });
      },
      reduced ? 0 : ROLL_MS,
    );
  }

  return (
    <section
      aria-labelledby="dado-de-la-suerte"
      className="relative overflow-hidden rounded-card bg-night p-5 text-on-night shadow-raised md:p-6"
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="dice-scene shrink-0" aria-hidden="true">
          <div
            className="dice"
            data-rolling={rolling ? "true" : undefined}
            style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
          >
            {FACES.map((face) => (
              <div key={face} className="dice-face" data-face={face}>
                {Array.from({ length: 9 }, (_, slot) => (
                  <span key={slot} className={PIPS[face].includes(slot) ? "dice-pip" : undefined} />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full min-w-0 text-center sm:text-left">
          <h2
            id="dado-de-la-suerte"
            className="font-display text-xl font-extrabold tracking-tight md:text-2xl"
          >
            🎲 Dado de la suerte
          </h2>
          <p className="mt-1 text-sm text-on-night-muted">
            Elegí una bolsa o una cripto y tirá el dado: del 1 al 3 baja, del 4 al 6 sube.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="dado-activo" className="sr-only">
              Qué querés que prediga el dado
            </label>
            <select
              id="dado-activo"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
              className="min-w-0 flex-1 rounded-full border border-on-night/20 bg-night-raised px-4 py-2.5 text-sm font-semibold text-on-night"
            >
              <option value={RANDOM}>Cualquiera, al azar</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={roll}
              disabled={rolling || assets.length === 0}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-surface transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-60"
            >
              {rolling ? "Tirando…" : "Tirar el dado"}
            </button>
          </div>

          <p aria-live="polite" className="mt-4 min-h-14 text-lg font-bold">
            {result ? (
              <span
                className={`dice-result inline-flex flex-wrap items-center justify-center gap-x-2 rounded-xl px-3 py-2 sm:justify-start ${result.verdict === "sube" ? "bg-success/25" : "bg-danger/25"}`}
              >
                <span aria-hidden="true">{result.verdict === "sube" ? "📈" : "📉"}</span>
                <span>
                  Salió {result.face}: {result.asset} {result.verdict === "sube" ? "sube" : "baja"}
                </span>
              </span>
            ) : rolling ? (
              <span className="text-on-night-muted">Rodando…</span>
            ) : null}
          </p>
        </div>
      </div>

      <p className="mt-4 border-t border-on-night/15 pt-3 text-xs text-on-night-muted">
        Es un juego de azar: el dado no sabe nada de la bolsa y no es un consejo de inversión.
      </p>
    </section>
  );
}
