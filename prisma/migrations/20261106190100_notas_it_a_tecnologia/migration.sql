-- Las notas de las secciones IT y de Gaming pasan a Tecnología, así siguen en la portada del
-- diario (pedido de Manu, 2026-11-06). Nada se borra.
-- Para poder volver atrás, cada movimiento queda anotado en domain_events
-- (type ARTICLE_CATEGORY_MOVED, payload con la sección de origen) y ya marcado como procesado,
-- así ningún consumidor del outbox lo toma.
-- En una base nueva no hay notas ni secciones todavía: no hace nada.
WITH moved AS (
  UPDATE "articles" AS a
  SET "category_id" = t."id"
  FROM "categories" AS c, "categories" AS t
  WHERE a."category_id" = c."id"
    AND c."slug" IN ('ia', 'programacion', 'ciberseguridad', 'hardware', 'trabajo-it', 'gaming')
    AND t."slug" = 'tecnologia'
  RETURNING a."id" AS article_id, c."slug" AS from_slug
)
INSERT INTO "domain_events" ("id", "type", "aggregate_type", "aggregate_id", "payload", "occurred_at", "processed_at")
SELECT
  'mig_' || md5(article_id || from_slug),
  'ARTICLE_CATEGORY_MOVED',
  'article',
  article_id,
  jsonb_build_object('articleId', article_id, 'from', from_slug, 'to', 'tecnologia', 'reason', 'diario general 2026-11-06'),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM moved;
