-- Manu probó /en-vivo (2026-11-07): sólo andaba "Costa atlántica y Patagonia". Se sacan las otras
-- tres y se suman candidatas nuevas; las que no estén al aire las oculta el sitio solo.
DELETE FROM "live_cams" WHERE "youtube_id" IN ('teXukOT_AuA', 'RugYzs0uftE', '2u4GnVNtlsY');

INSERT INTO "live_cams" ("id", "title", "place", "youtube_id", "sort_order") VALUES
    ('livecam_buenos_aires', 'Buenos Aires en vivo', 'Ciudad de Buenos Aires', 'HVKwnWZQr78', 1),
    ('livecam_el_calafate', 'El Calafate y el glaciar Perito Moreno', 'Santa Cruz', 'A6VDMzFQNnU', 3),
    ('livecam_patagonia', 'Patagonia en vivo', 'Bariloche, Ruta 40, Esquel y El Bolsón', '8MhY4vTPzzk', 4),
    ('livecam_argentina', 'Argentina en vivo', 'Ciudades y paisajes del país', 'C8vq4oucDEY', 5)
ON CONFLICT ("youtube_id") DO NOTHING;
