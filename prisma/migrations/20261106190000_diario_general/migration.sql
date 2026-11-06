-- MeContaron pasa a ser un diario nacional (pedido de Manu, 2026-11-06).
-- Vuelven al menú y a la portada las secciones generales, en este orden. Las secciones IT y
-- Gaming quedan desactivadas (ocultas): no se borran ni ellas ni sus notas, y se vuelven a
-- mostrar activándolas desde el panel.
-- Una base nueva llega acá con la tabla vacía y no se toca: el bootstrap del deploy carga las
-- categorías iniciales (prisma/data/categories.ts), que ya vienen con este orden.
UPDATE "categories"
SET "is_active" = "slug" IN (
      'politica', 'economia', 'sociedad', 'mundo', 'seguridad', 'deportes',
      'tecnologia', 'cultura', 'ciencia', 'tendencias'
    ),
    "sort_order" = CASE "slug"
      WHEN 'politica' THEN 1
      WHEN 'economia' THEN 2
      WHEN 'sociedad' THEN 3
      WHEN 'mundo' THEN 4
      WHEN 'seguridad' THEN 5
      WHEN 'deportes' THEN 6
      WHEN 'tecnologia' THEN 7
      WHEN 'cultura' THEN 8
      WHEN 'ciencia' THEN 9
      WHEN 'tendencias' THEN 10
      ELSE "sort_order" % 100 + 100
    END,
    "updated_at" = CURRENT_TIMESTAMP;
