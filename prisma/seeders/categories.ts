import type { PrismaClient } from "../../src/generated/prisma/client";
import { INITIAL_CATEGORIES } from "../data/categories";

/** Crea las categorías iniciales que falten. No modifica las existentes. Devuelve cuántas creó. */
export async function seedCategories(db: PrismaClient): Promise<number> {
  let created = 0;
  for (const [index, category] of INITIAL_CATEGORIES.entries()) {
    const existing = await db.category.findUnique({ where: { slug: category.slug } });
    if (existing) continue;
    await db.category.create({ data: { ...category, sortOrder: index } });
    created++;
  }
  return created;
}
