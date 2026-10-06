import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../../src/server/auth/password";
import { seedCategories } from "./categories";

export type AdminInput = { email?: string; name?: string; password?: string };

export type BootstrapResult = {
  /** null si ya había categorías y no se tocaron. */
  categoriesCreated: number | null;
  /** Email del administrador creado, o null si ya existía uno. */
  adminCreated: string | null;
};

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

/**
 * Deja una base recién migrada lista para usar. Se ejecuta en cada deploy, así que sólo
 * actúa sobre una base vacía:
 * - Categorías: se cargan únicamente si la tabla está vacía. Si corriera siempre, una
 *   categoría borrada desde el panel reaparecería en el próximo deploy.
 * - Administrador: se crea únicamente si no hay ningún ADMIN activo. Después de eso las
 *   variables ADMIN_* se ignoran y conviene borrarlas.
 */
export async function bootstrap(db: PrismaClient, admin: AdminInput): Promise<BootstrapResult> {
  const categoriesCreated = (await db.category.count()) === 0 ? await seedCategories(db) : null;

  if ((await db.user.count({ where: { role: "ADMIN", isActive: true } })) > 0) {
    return { categoriesCreated, adminCreated: null };
  }

  const parsed = adminSchema.safeParse(admin);
  if (!parsed.success) {
    throw new Error(
      "La base no tiene administrador. Definí ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD " +
        `(mínimo ${MIN_PASSWORD_LENGTH} caracteres) para crearlo en este deploy.`,
    );
  }
  const { email, name, password } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) {
    throw new Error(`Ya existe un usuario con ${email}, pero no es un administrador activo.`);
  }
  await db.user.create({
    data: { email, name, passwordHash: await hashPassword(password), role: "ADMIN" },
  });
  return { categoriesCreated, adminCreated: email };
}
