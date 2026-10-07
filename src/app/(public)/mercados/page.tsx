import type { Metadata } from "next";
import { LuckyDice } from "@/components/markets/LuckyDice";
import { MarketsBoard } from "@/components/markets/MarketsBoard";
import { CRYPTOS, INDICES } from "@/lib/markets";
import { getMarkets } from "@/server/services/markets";

export const metadata: Metadata = {
  title: "Mercados",
  description:
    "Las principales bolsas del mundo y las criptomonedas, con gráficos que se renuevan cada media hora.",
  alternates: { canonical: "/mercados" },
};

/** El dado puede "predecir" cualquiera de los que muestra la página, aunque la fuente no haya respondido. */
const DICE_ASSETS = [...INDICES, ...CRYPTOS].map(({ id, name }) => ({ id, name }));

export default async function MarketsPage() {
  const markets = await getMarkets();
  return (
    <div className="mx-auto grid max-w-site grid-cols-1 gap-8 px-4 py-8 md:px-8 md:py-10">
      <header className="grid grid-cols-1 gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Mercados</h1>
        <p className="max-w-2xl text-ink-muted">
          Cómo vienen las principales bolsas del mundo y las criptomonedas, con el gráfico de cada una.
        </p>
      </header>
      <LuckyDice assets={DICE_ASSETS} />
      <MarketsBoard initial={markets} />
    </div>
  );
}
