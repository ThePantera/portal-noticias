# ADR 0009: Cotización del dólar

**Estado:** aceptado e implementado (7 oct 2026)

## Decisión

El sitio muestra el dólar blue, oficial, MEP, CCL y tarjeta (precio de compra y de venta) y la brecha entre el blue y el oficial: en una barra arriba de la cabecera, en todas las páginas, y en un panel de la portada.

- **Fuente:** [DolarApi](https://dolarapi.com) (`GET https://dolarapi.com/v1/dolares`): gratis, sin llave y con todas las cotizaciones en un pedido. Si falla o cambia el formato, se usa [Bluelytics](https://bluelytics.com.ar) (`/v2/latest`), que sólo trae el blue y el oficial. Si ninguna responde, el panel dice que la cotización no está disponible; la página nunca falla por esto.
- **Servidor:** `getDollarRates()` (`src/server/services/exchange-rates.ts`) consulta la fuente con un tiempo límite de 4 segundos y guarda el resultado con `"use cache"` y `cacheLife("minutes")`: una consulta por minuto como mucho, la compartan las visitas que sean.
- **Navegador:** la página llega con la cotización ya renderizada. Mientras la pestaña está a la vista, `useDollarRates` la vuelve a pedir cada minuto a `GET /api/cotizaciones` (que lee la misma caché) y actualiza los paneles sin recargar. Con la pestaña oculta no pide nada.
- **Validación:** las respuestas de las fuentes se validan con zod (`src/lib/exchange-rates.ts`). El formato para pantalla vive aparte (`src/lib/exchange-format.ts`) para no mandar zod al navegador.

## Consecuencias

"En tiempo real" significa con un minuto de demora como mucho, más lo que tarde la fuente en actualizarse. Las fuentes publican precios de referencia, no de operación: el panel cita la fuente.
