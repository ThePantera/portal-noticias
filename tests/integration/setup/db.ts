import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { testDatabaseUrl } from "./global";

export const testDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) });

/** Vacía todas las tablas del modelo entre tests. */
export async function resetDatabase() {
  await testDb.$executeRawUnsafe(`
    TRUNCATE TABLE article_tags, article_media, article_slug_history, articles, media, tags,
      categories, sessions, login_attempts, domain_events, users RESTART IDENTITY CASCADE;
  `);
}

let counter = 0;
/** Crea un autor y una categoría mínimos para probar notas. */
export async function createAuthorAndCategory() {
  counter++;
  const author = await testDb.user.create({
    data: { email: `autor${counter}@test.local`, name: "Autor", passwordHash: "!" },
  });
  const category = await testDb.category.create({
    data: { name: `Categoría ${counter}`, slug: `categoria-${counter}` },
  });
  return { author, category };
}
