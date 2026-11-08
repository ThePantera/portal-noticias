-- Coberturas en vivo, pedido de Manu (2026-11-08): una nota puede marcarse "En vivo" y
-- recibir actualizaciones cortas desde el panel.
ALTER TABLE "articles" ADD COLUMN "is_live" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "article_live_updates" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_live_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "article_live_updates_article_id_created_at_idx" ON "article_live_updates"("article_id", "created_at" DESC);

ALTER TABLE "article_live_updates" ADD CONSTRAINT "article_live_updates_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
