# ADR 0010: Sección Mercados y dado de la suerte

**Estado:** aceptado e implementado (7 oct 2026)

## Decisión

La página `/mercados` (en el menú, fuera de la portada) muestra las principales bolsas (S&P 500, Nasdaq, Dow Jones, Merval, Bovespa, Nikkei 225 y DAX) y las criptomonedas principales (Bitcoin, Ethereum, Tether y Solana), cada una con su valor, la variación y un gráfico chico. Arriba está el "dado de la suerte".

- **Fuentes:** las bolsas salen de Yahoo Finance (`/v8/finance/chart/{símbolo}?range=1mo&interval=1d`, sin llave), probando `query1` y después `query2`. Las criptomonedas salen de CoinGecko (`/api/v3/coins/markets` con `sparkline=true`, sin llave, las cuatro en un pedido y siete días de gráfico); si no responde, cada moneda se pide a Yahoo (`BTC-USD`, etc.). Las respuestas se validan con zod (`src/lib/markets.ts`).
- **Media hora:** `getMarkets()` (`src/server/services/markets.ts`) guarda el resultado con `"use cache"` y `cacheLife` de 30 minutos. Si alguna fuente falló, la caché dura sólo unos minutos para reintentar pronto. En el navegador, `useMarkets` vuelve a pedir `GET /api/mercados` cada media hora mientras la pestaña está a la vista.
- **Variación:** índices, entre los dos últimos cierres diarios; cripto, la de 24 horas que informa CoinGecko. El color del gráfico sigue la variación del período que muestra.
- **Gráficos:** SVG generado en el servidor (`sparklinePath` en `src/lib/market-format.ts`), sin biblioteca de gráficos. Son decorativos: el valor y la variación están en texto.
- **Dado:** componente de cliente con un cubo en 3D de CSS. Sale una cara con `Math.random`: del 1 al 3 "baja", del 4 al 6 "sube". No mira ningún dato del mercado y la tarjeta lo dice: es un juego, no un consejo de inversión.

## Consecuencias

Si ninguna fuente responde, la página lo dice y el dado sigue andando. Yahoo y CoinGecko publican valores de referencia con demora: la página cita las fuentes.
