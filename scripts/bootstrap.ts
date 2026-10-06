/**
 * Prepara la base en cada deploy, después de `prisma migrate deploy` (ver docs/deploy-vercel.md).
 * Sólo carga categorías y crea el administrador si la base está vacía; nunca imprime la contraseña.
 * Uso: npm run db:bootstrap
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { bootstrap } from "../prisma/seeders/bootstrap";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

bootstrap(db, {
  email: process.env.ADMIN_EMAIL,
  name: process.env.ADMIN_NAME,
  password: process.env.ADMIN_PASSWORD,
})
  .then(({ categoriesCreated, adminCreated }) => {
    console.log(
      categoriesCreated === null
        ? "Categorías: ya había, no se tocaron."
        : `Categorías: ${categoriesCreated} creadas.`,
    );
    console.log(
      adminCreated === null
        ? "Administrador: ya existe, no se crea otro."
        : `Administrador creado: ${adminCreated}. Ya podés borrar ADMIN_PASSWORD del entorno.`,
    );
  })
  .catch((error: Error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
