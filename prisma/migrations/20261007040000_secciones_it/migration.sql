-- El portal pasa a ser de noticias para la comunidad IT (pedido de Manu, 2026-10-07).
-- 1) Crea las secciones IT que faltan. 2) Deja en el menú y en la portada sólo las secciones IT,
-- en este orden. Las demás quedan desactivadas (ocultas), sin borrar ni las secciones ni sus notas:
-- se vuelven a mostrar activándolas desde el panel.
-- Igual que con Gaming, una base nueva llega con la tabla vacía y no se toca: el bootstrap del
-- deploy carga todas las categorías iniciales (prisma/data/categories.ts).
INSERT INTO "categories" ("id", "name", "slug", "description", "sort_order", "is_active", "updated_at")
SELECT v.id, v.name, v.slug, v.description, v.sort_order, true, CURRENT_TIMESTAMP
FROM (VALUES
  ('cat_ia', 'Inteligencia Artificial', 'ia', 'Modelos, herramientas y empresas de IA, y cómo cambian el trabajo.', 11),
  ('cat_programacion', 'Programación', 'programacion', 'Lenguajes, frameworks, open source y herramientas para desarrollar.', 12),
  ('cat_ciberseguridad', 'Ciberseguridad', 'ciberseguridad', 'Vulnerabilidades, ataques, filtraciones y cómo protegerse.', 13),
  ('cat_hardware', 'Hardware', 'hardware', 'Procesadores, placas de video, celulares, computadoras y gadgets.', 14),
  ('cat_trabajo_it', 'Trabajo IT', 'trabajo-it', 'Empleo, sueldos en dólares, freelance y carreras en tecnología.', 15)
) AS v(id, name, slug, description, sort_order)
WHERE EXISTS (SELECT 1 FROM "categories")
ON CONFLICT DO NOTHING;

UPDATE "categories"
SET "is_active" = "slug" IN ('ia', 'programacion', 'ciberseguridad', 'hardware', 'gaming', 'tecnologia', 'trabajo-it'),
    "sort_order" = CASE "slug"
      WHEN 'ia' THEN 1
      WHEN 'programacion' THEN 2
      WHEN 'ciberseguridad' THEN 3
      WHEN 'hardware' THEN 4
      WHEN 'gaming' THEN 5
      WHEN 'tecnologia' THEN 6
      WHEN 'trabajo-it' THEN 7
      ELSE "sort_order" + 100
    END,
    "updated_at" = CURRENT_TIMESTAMP;
