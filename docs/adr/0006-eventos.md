# ADR 0006: Eventos de dominio con outbox

**Estado:** propuesto (6 oct 2026)

## Decisión

Cada cambio relevante de una nota escribe, en la misma transacción, una fila en `domain_events`. Tipos: ARTICLE_CREATED, ARTICLE_UPDATED, ARTICLE_SCHEDULED, ARTICLE_PUBLISHED, ARTICLE_UNPUBLISHED, ARTICLE_ARCHIVED y ARTICLE_DELETED. Tipado en TypeScript como unión discriminada; en la base es un `string`, para sumar tipos sin migrar.

Un despachador procesa las filas pendientes (`processedAt IS NULL`) en orden, con `attempts` y `lastError`, y toma lotes con `FOR UPDATE SKIP LOCKED` para que varios workers no procesen lo mismo.

## Por qué no un bus en memoria o una cola externa

Con un bus en memoria, el evento se pierde si el proceso cae justo después del commit. Una cola externa (Redis, SQS) es otra pieza de infraestructura que el MVP no necesita. El outbox da entrega garantizada con la base que ya existe, y más adelante puede alimentar una cola si el volumen lo pide.

## Consecuencias

En el MVP el único consumidor invalida la caché de Next. Telegram, newsletter, redes, webhooks o analytics se suman como manejadores nuevos, sin tocar el servicio de notas.
