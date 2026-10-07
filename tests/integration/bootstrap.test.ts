import { beforeEach, describe, expect, it } from "vitest";
import { bootstrap } from "../../prisma/seeders/bootstrap";
import { verifyPassword } from "../../src/server/auth/password";
import { resetDatabase, testDb } from "./setup/db";

beforeEach(resetDatabase);

const admin = { email: " Editora@Portal.test ", name: "Editora", password: "una-contraseña-larga" };

describe("bootstrap del deploy", () => {
  it("en una base vacía carga las categorías y crea el administrador", async () => {
    expect(await bootstrap(testDb, admin)).toEqual({
      categoriesCreated: 11,
      adminCreated: "editora@portal.test",
    });
    const user = await testDb.user.findUniqueOrThrow({ where: { email: "editora@portal.test" } });
    expect(user.role).toBe("ADMIN");
    expect(user.passwordHash).not.toContain(admin.password);
    expect(await verifyPassword(user.passwordHash, admin.password)).toBe(true);
  });

  it("en el segundo deploy no toca nada, aunque sigan las variables", async () => {
    await bootstrap(testDb, admin);
    expect(await bootstrap(testDb, { ...admin, email: "otra@portal.test" })).toEqual({
      categoriesCreated: null,
      adminCreated: null,
    });
    expect(await testDb.user.count()).toBe(1);
  });

  it("una categoría borrada desde el panel no reaparece", async () => {
    await bootstrap(testDb, admin);
    await testDb.category.delete({ where: { slug: "tendencias" } });
    await bootstrap(testDb, admin);
    expect(await testDb.category.findUnique({ where: { slug: "tendencias" } })).toBeNull();
  });

  it("sin administrador y sin variables, falla con un mensaje que dice qué definir", async () => {
    await expect(bootstrap(testDb, {})).rejects.toThrow(/ADMIN_EMAIL, ADMIN_NAME y ADMIN_PASSWORD/);
    await expect(bootstrap(testDb, { ...admin, password: "corta" })).rejects.toThrow(/mínimo 12/);
    expect(await testDb.user.count()).toBe(0);
  });
});
