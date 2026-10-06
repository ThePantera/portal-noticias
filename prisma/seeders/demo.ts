import type { PrismaClient } from "../../src/generated/prisma/client";
import { extractPlainText, readingTimeMinutes, type EditorDoc } from "../../src/lib/content";
import { slugify } from "../../src/lib/slug";
import { DEMO_ARTICLES } from "../data/demo-articles";

const HOUR = 60 * 60 * 1000;
export const DEMO_AUTHOR_EMAIL = "redaccion@demo.local";

function toDoc(paragraphs: string[]): EditorDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  };
}

/** Crea el autor de demo y las notas de ejemplo que falten. Requiere las categorías. Devuelve cuántas notas creó. */
export async function seedDemo(db: PrismaClient, now = new Date()): Promise<number> {
  const author = await db.user.upsert({
    where: { email: DEMO_AUTHOR_EMAIL },
    update: {},
    // Hash inválido a propósito y usuario inactivo: esta cuenta no puede iniciar sesión.
    create: {
      email: DEMO_AUTHOR_EMAIL,
      name: "Redacción",
      passwordHash: "!demo-sin-acceso",
      isActive: false,
    },
  });

  let created = 0;
  for (const demo of DEMO_ARTICLES) {
    const slug = slugify(demo.title);
    if (await db.article.findUnique({ where: { slug } })) continue;

    const category = await db.category.findUnique({ where: { slug: demo.category } });
    if (!category) throw new Error(`Falta la categoría "${demo.category}". Corré antes npm run db:seed.`);

    const tagIds: string[] = [];
    for (const name of demo.tags) {
      const tag = await db.tag.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      });
      tagIds.push(tag.id);
    }

    const content = toDoc(demo.paragraphs);
    const contentText = extractPlainText(content);
    const hasPublishDate = demo.status === "PUBLISHED" || demo.status === "ARCHIVED";

    await db.article.create({
      data: {
        title: demo.title,
        slug,
        excerpt: demo.excerpt,
        content,
        contentText,
        readingTimeMinutes: readingTimeMinutes(contentText),
        status: demo.status,
        featuredRank: demo.featuredRank ?? null,
        publishedAt: hasPublishDate ? new Date(now.getTime() - (demo.hoursAgo ?? 1) * HOUR) : null,
        scheduledAt: demo.scheduledInHours ? new Date(now.getTime() + demo.scheduledInHours * HOUR) : null,
        archivedAt: demo.status === "ARCHIVED" ? now : null,
        categoryId: category.id,
        authorId: author.id,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    created++;
  }
  return created;
}
