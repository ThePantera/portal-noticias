import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { hashSessionToken } from "@/server/auth/tokens";
import { login } from "@/server/services/auth";
import { invalidateSessionToken, validateSessionToken } from "@/server/services/sessions";
import { resetDatabase, testDb } from "./setup/db";

const PASSWORD = "contraseña-de-prueba-larga";
const meta = { ipAddress: "203.0.113.7", userAgent: "vitest" };

beforeEach(async () => {
  await resetDatabase();
  await testDb.user.create({
    data: { email: "manu@portal.test", name: "Manu", passwordHash: await hashPassword(PASSWORD) },
  });
});

describe("login", () => {
  it("con credenciales correctas crea una sesión cuyo id es el hash del token", async () => {
    const result = await login({ email: "manu@portal.test", password: PASSWORD }, meta);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sessions = await testDb.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(hashSessionToken(result.token));
    expect(sessions[0].id).not.toBe(result.token);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
    expect(
      (await testDb.user.findUnique({ where: { email: "manu@portal.test" } }))?.lastLoginAt,
    ).not.toBeNull();
  });

  it("responde igual con contraseña incorrecta y con email inexistente", async () => {
    expect(await login({ email: "manu@portal.test", password: "mal" }, meta)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await login({ email: "nadie@portal.test", password: PASSWORD }, meta)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await testDb.session.count()).toBe(0);
    expect(await testDb.loginAttempt.count({ where: { success: false } })).toBe(2);
  });

  it("rechaza a un usuario desactivado aunque la contraseña sea correcta", async () => {
    await testDb.user.update({ where: { email: "manu@portal.test" }, data: { isActive: false } });
    expect(await login({ email: "manu@portal.test", password: PASSWORD }, meta)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("bloquea el email después de 5 fallos, incluso con la contraseña correcta", async () => {
    for (let i = 0; i < 5; i++) await login({ email: "manu@portal.test", password: "mal" }, meta);
    expect(await login({ email: "manu@portal.test", password: PASSWORD }, meta)).toEqual({
      ok: false,
      reason: "blocked",
    });
  });

  it("los fallos viejos (fuera de la ventana de 15 minutos) no bloquean", async () => {
    const old = new Date(Date.now() - 16 * 60 * 1000);
    await testDb.loginAttempt.createMany({
      data: Array.from({ length: 5 }, () => ({ email: "manu@portal.test", success: false, createdAt: old })),
    });
    expect((await login({ email: "manu@portal.test", password: PASSWORD }, meta)).ok).toBe(true);
  });

  it("bloquea una IP después de 20 fallos con distintos emails", async () => {
    for (let i = 0; i < 20; i++) await login({ email: `x${i}@portal.test`, password: "mal" }, meta);
    expect(await login({ email: "manu@portal.test", password: PASSWORD }, meta)).toEqual({
      ok: false,
      reason: "blocked",
    });
    // Desde otra IP sí puede entrar.
    expect(
      (await login({ email: "manu@portal.test", password: PASSWORD }, { ...meta, ipAddress: "198.51.100.1" }))
        .ok,
    ).toBe(true);
  });
});

describe("sesiones", () => {
  async function loginToken() {
    const result = await login({ email: "manu@portal.test", password: PASSWORD }, meta);
    if (!result.ok) throw new Error("login falló");
    return result.token;
  }

  it("valida un token vigente y devuelve sólo datos públicos del usuario", async () => {
    const user = await validateSessionToken(await loginToken());
    expect(user).toEqual({ id: expect.any(String), email: "manu@portal.test", name: "Manu", role: "ADMIN" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rechaza tokens inventados o vacíos", async () => {
    expect(await validateSessionToken("token-inventado")).toBeNull();
    expect(await validateSessionToken("")).toBeNull();
  });

  it("rechaza y borra una sesión vencida", async () => {
    const token = await loginToken();
    await testDb.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await testDb.session.count()).toBe(0);
  });

  it("cerrar sesión invalida el token", async () => {
    const token = await loginToken();
    await invalidateSessionToken(token);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("desactivar al usuario invalida sus sesiones", async () => {
    const token = await loginToken();
    await testDb.user.update({ where: { email: "manu@portal.test" }, data: { isActive: false } });
    expect(await validateSessionToken(token)).toBeNull();
  });
});
