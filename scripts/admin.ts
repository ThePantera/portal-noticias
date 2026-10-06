/**
 * Alta del administrador y cambio de contraseña desde el servidor. No hay registro público.
 *
 *   npm run admin:create            pide email, nombre y contraseña
 *   npm run admin:reset-password    pide email y contraseña nueva; cierra todas sus sesiones
 *
 * Sin terminal interactiva (CI, tests) toma ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD del entorno.
 */
import "dotenv/config";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../src/server/auth/password";

const command = process.argv[2];
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function ask(question: string, { hidden = false } = {}): Promise<string> {
  if (!stdin.isTTY) return "";
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (hidden) {
    // Oculta lo que se escribe: reemplaza el eco de la terminal.
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) =>
      write.call(rl, s.startsWith(question) ? s : "");
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden) stdout.write("\n");
  return answer.trim();
}

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(200);

async function readEmail() {
  const value = process.env.ADMIN_EMAIL || (await ask("Email: "));
  const parsed = emailSchema.safeParse(value);
  if (!parsed.success) throw new Error("El email no es válido.");
  return parsed.data;
}

async function readPassword() {
  const value =
    process.env.ADMIN_PASSWORD ||
    (await ask(`Contraseña (mínimo ${MIN_PASSWORD_LENGTH}): `, { hidden: true }));
  if (!passwordSchema.safeParse(value).success) {
    throw new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (!process.env.ADMIN_PASSWORD && stdin.isTTY) {
    const again = await ask("Repetí la contraseña: ", { hidden: true });
    if (again !== value) throw new Error("Las contraseñas no coinciden.");
  }
  return value;
}

async function create() {
  const email = await readEmail();
  if (await db.user.findUnique({ where: { email } })) {
    throw new Error(
      `Ya existe un usuario con ${email}. Usá admin:reset-password para cambiar su contraseña.`,
    );
  }
  const name = (process.env.ADMIN_NAME || (await ask("Nombre para la firma: "))).trim();
  if (!name) throw new Error("El nombre es obligatorio.");
  const passwordHash = await hashPassword(await readPassword());
  await db.user.create({ data: { email, name, passwordHash, role: "ADMIN" } });
  console.log(`Administrador creado: ${email}`);
}

async function resetPassword() {
  const email = await readEmail();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No existe un usuario con ${email}.`);
  const passwordHash = await hashPassword(await readPassword());
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  console.log(`Contraseña actualizada para ${email}. Se cerraron sus sesiones abiertas.`);
}

const commands: Record<string, () => Promise<void>> = { create, "reset-password": resetPassword };

(
  commands[command ?? ""] ??
  (async () => {
    throw new Error("Uso: tsx scripts/admin.ts create | reset-password");
  })
)()
  .catch((error: Error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
