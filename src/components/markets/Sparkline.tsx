import { sparklinePath } from "@/lib/market-format";

const WIDTH = 160;
const HEIGHT = 48;

/** Gráfico chico de la tarjeta. Es decorativo: el precio y la variación van en texto al lado. */
export function Sparkline({ points, trend }: { points: number[]; trend: "up" | "down" | "flat" }) {
  const { line, area } = sparklinePath(points, WIDTH, HEIGHT);
  const tone = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-ink-subtle";
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`h-12 w-full ${tone}`}
    >
      <path d={area} fill="currentColor" fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
