-- Sección "Gaming" para las bases que ya están en uso (producción).
-- Una base nueva llega acá con la tabla vacía y no se toca: el bootstrap del deploy carga
-- todas las categorías iniciales (prisma/data/categories.ts), Gaming incluida. Si se
-- insertara siempre, el bootstrap vería la tabla con datos y no cargaría las demás.
-- ON CONFLICT: si ya existe una sección con ese nombre o esa dirección, no se duplica.
INSERT INTO "categories" ("id", "name", "slug", "description", "sort_order", "is_active", "updated_at")
SELECT 'cat_gaming', 'Gaming', 'gaming', 'Videojuegos, consolas, esports y la industria del juego.', 10, true, CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "categories")
ON CONFLICT DO NOTHING;
