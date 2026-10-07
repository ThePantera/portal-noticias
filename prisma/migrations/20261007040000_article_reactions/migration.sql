-- CreateTable
CREATE TABLE "article_reactions" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "visitor_hash" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_reactions_article_id_emoji_idx" ON "article_reactions"("article_id", "emoji");

-- CreateIndex
CREATE INDEX "article_reactions_ip_hash_created_at_idx" ON "article_reactions"("ip_hash", "created_at");

-- CreateIndex
CREATE INDEX "article_reactions_user_id_idx" ON "article_reactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_reactions_article_id_visitor_hash_emoji_key" ON "article_reactions"("article_id", "visitor_hash", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "article_reactions_article_id_user_id_emoji_key" ON "article_reactions"("article_id", "user_id", "emoji");

-- AddForeignKey
ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
