import "server-only";
import { createHash } from "node:crypto";
import { CONTACT_MAX_PER_HOUR, type ContactInput } from "@/lib/contact";
import { db } from "@/server/db";

/** Formulario de contacto: los mensajes quedan en la base y se leen en el panel. */

export function hashIp(ip: string): string {
  return createHash("sha256").update(`portal-contacto:${ip}`).digest("hex");
}

export async function createContactMessage(
  input: ContactInput,
  ipHash: string | null,
): Promise<{ ok: true } | { ok: false; reason: "rate-limit" }> {
  if (ipHash) {
    const recent = await db.contactMessage.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    if (recent >= CONTACT_MAX_PER_HOUR) return { ok: false, reason: "rate-limit" };
  }
  await db.contactMessage.create({ data: { ...input, ipHash } });
  return { ok: true };
}

export function listContactMessages(limit = 100) {
  return db.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, name: true, email: true, message: true, createdAt: true },
  });
}
