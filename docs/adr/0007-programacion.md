# ADR 0007: Publicación programada

**Estado:** aceptado e implementado (6 oct 2026)

## Decisión

`publishDueArticles(now)` en `server/jobs`: un único `UPDATE ... SET status='PUBLISHED', published_at=scheduled_at WHERE status='SCHEDULED' AND scheduled_at <= now RETURNING id`, más un evento ARTICLE_PUBLISHED por cada fila, todo en una transacción. Es idempotente y seguro con ejecuciones concurrentes.

Disparadores:

1. `POST /api/cron/publish-scheduled` (también acepta `GET`, que es lo que manda Vercel Cron) con `Authorization: Bearer $CRON_SECRET`. En producción lo llama GitHub Actions cada 5 minutos (`.github/workflows/publicar-programadas.yml`): Vercel Hobby sólo permite crons diarios. Sin `CRON_SECRET` configurado, el endpoint responde 503 y nunca queda abierto.
2. `npm run jobs:publish-scheduled` para ejecutarlo a mano o desde crontab.

El público nunca ve una nota SCHEDULED aunque su hora ya haya pasado: el backend tiene que publicarla primero, como pide el requisito.

## Riesgo

Si el cron se detiene, las notas se atrasan. El dashboard muestra "programadas vencidas", y el endpoint `/api/health` lo informa para poder configurar una alerta.

## Evolución

Un worker dedicado (BullMQ o pg-boss) puede reemplazar al cron llamando a la misma función.
