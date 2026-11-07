-- Cámaras en vivo (/en-vivo), pedido de Manu (2026-11-07). Se cargan desde el panel; arrancan
-- con transmisiones 24/7 de YouTube encontradas al armar la página. Si alguna deja de existir,
-- el sitio la oculta solo (se consulta el oEmbed de YouTube).
CREATE TABLE "live_cams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT NOT NULL,
    "youtube_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_cams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_cams_youtube_id_key" ON "live_cams"("youtube_id");

CREATE INDEX "live_cams_sort_order_idx" ON "live_cams"("sort_order");

INSERT INTO "live_cams" ("id", "title", "place", "youtube_id", "sort_order") VALUES
    ('livecam_bariloche', 'Bariloche y la cordillera', 'Río Negro', 'teXukOT_AuA', 1),
    ('livecam_costa_patagonia_1', 'Costa atlántica y Patagonia', 'Villa Gesell, Pinamar y Comodoro Rivadavia', 'DVEgFZSlLUg', 2),
    ('livecam_costa_patagonia_2', 'Playas y paseos de la Argentina', 'Villa Gesell, Pinamar y Comodoro Rivadavia', 'RugYzs0uftE', 3),
    ('livecam_costa_patagonia_3', 'Argentina en vivo', 'Costa atlántica y Patagonia', '2u4GnVNtlsY', 4);
