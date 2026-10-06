"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeAdminPath } from "@/lib/redirect";
import { setSessionCookie } from "@/server/auth/cookies";
import { login, loginSchema } from "@/server/services/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  email?: string;
};

const MESSAGES = {
  invalid: "Email o contraseña incorrectos.",
  blocked: "Demasiados intentos fallidos. Esperá 15 minutos y probá de nuevo.",
  unexpected: "No pudimos iniciar sesión. Probá de nuevo en unos segundos.",
};

function clientIp(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return { email, fieldErrors: { email: fields.email?.[0], password: fields.password?.[0] } };
  }

  const h = await headers();
  let result;
  try {
    result = await login(parsed.data, { ipAddress: clientIp(h), userAgent: h.get("user-agent") });
  } catch (error) {
    console.error("Login: error inesperado", error);
    return { email, error: MESSAGES.unexpected };
  }
  if (!result.ok) return { email, error: MESSAGES[result.reason] };

  await setSessionCookie(result.token, result.expiresAt);
  redirect(safeAdminPath(formData.get("next")));
}
