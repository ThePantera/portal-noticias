-- Lecturas por nota y por día, y mensajes del formulario de contacto (pedido de Manu, 2026-11-07).
-- Sólo agrega tablas: no toca datos existentes.
CREATE TABLE "article_views_daily" (
    "article_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "article_views_daily_pkey" PRIMARY KEY ("article_id","day")
);

CREATE INDEX "article_views_daily_day_idx" ON "article_views_daily"("day");

ALTER TABLE "article_views_daily" ADD CONSTRAINT "article_views_daily_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_messages_created_at_idx" ON "contact_messages"("created_at" DESC);

CREATE INDEX "contact_messages_ip_hash_created_at_idx" ON "contact_messages"("ip_hash", "created_at");
