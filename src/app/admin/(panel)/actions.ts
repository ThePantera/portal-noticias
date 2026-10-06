"use server";

import { redirect } from "next/navigation";
import { deleteSessionCookie, readSessionCookie } from "@/server/auth/cookies";
import { invalidateSessionToken } from "@/server/services/sessions";

export async function logoutAction() {
  const token = await readSessionCookie();
  if (token) await invalidateSessionToken(token);
  await deleteSessionCookie();
  redirect("/admin/login");
}
