import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from "../../src/server/auth/password";
import { seedCategories } from "./categories";

export type AdminInput = {
  email?: string;
  name?: string;
  password?: string;
  /** ADMIN_RESET_PASSWORD: clave nueva para el administrador existente (si se olvidó la anterior). */
  resetPassword?: string;
};

export type BootstrapResult = {
  /** null si ya había categorías y no se tocaron. */
  categoriesCreated: number | null;
  /** Email del administrador creado, o null si ya existía uno. */
  adminCreated: string | null;
  /** Email del administrador al que se le cambió la clave con ADMIN_RESET_PASSWORD. */
  passwordReset?: string;
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
    const passwordReset = admin.resetPassword ? await resetAdminPassword(db, admin) : null;
    return passwordReset
      ? { categoriesCreated, adminCreated: null, passwordReset }
      : { categoriesCreated, adminCreated: null };
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

/**
 * Cambia la clave del administrador con ADMIN_RESET_PASSWORD, para cuando se olvidó la anterior
 * y sólo se tiene acceso a las variables de Vercel. El administrador es el de ADMIN_EMAIL o, si
 * no está definido, el único ADMIN activo. Si la clave ya es esa no hace nada: dejar la variable
 * puesta no cierra las sesiones en cada deploy. Devuelve el email si la cambió.
 */
async function resetAdminPassword(db: PrismaClient, admin: AdminInput): Promise<string | null> {
  const password = admin.resetPassword ?? "";
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    throw new Error(`ADMIN_RESET_PASSWORD tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  const email = admin.email?.trim().toLowerCase();
  const admins = await db.user.findMany({
    where: { role: "ADMIN", isActive: true, ...(email ? { email } : {}) },
    select: { id: true, email: true, passwordHash: true },
  });
  if (admins.length !== 1) {
    throw new Error(
      email
        ? `ADMIN_RESET_PASSWORD: no hay un administrador activo con ${email}.`
        : "ADMIN_RESET_PASSWORD: hay más de un administrador; definí ADMIN_EMAIL para elegir cuál.",
    );
  }
  const [user] = admins;
  if (await verifyPassword(user.passwordHash, password)) return null;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return user.email;
}
