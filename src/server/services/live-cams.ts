import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { LIVE_CAMS_TAG } from "@/lib/cache-tags";
import { watchUrl, type LiveCam } from "@/lib/live-cams";
import { db } from "@/server/db";

/** Cámaras en vivo (/en-vivo): transmisiones de YouTube cargadas desde el panel. */

export function listLiveCams(): Promise<LiveCam[]> {
  return db.liveCam.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, place: true, youtubeId: true },
  });
}

/**
 * ¿El video sigue existiendo y se puede insertar? Lo dice el oEmbed de YouTube (401 o 404 si
 * se borró o no deja insertarse). Si YouTube no responde, se muestra igual.
 */
async function isEmbeddable(youtubeId: string): Promise<boolean> {
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(youtubeId))}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return response.ok || response.status >= 500;
  } catch {
    return true;
  }
}

/** Las cámaras que se pueden ver. Se revisan cada hora o al cambiar la lista en el panel. */
export async function getPublicLiveCams(): Promise<LiveCam[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(LIVE_CAMS_TAG);
  const cams = await listLiveCams();
  const checks = await Promise.all(cams.map((cam) => isEmbeddable(cam.youtubeId)));
  return cams.filter((_, i) => checks[i]);
}

export async function addLiveCam(input: { title: string; place: string; youtubeId: string }) {
  const last = await db.liveCam.aggregate({ _max: { sortOrder: true } });
  await db.liveCam.upsert({
    where: { youtubeId: input.youtubeId },
    create: { ...input, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    update: { title: input.title, place: input.place },
  });
}

export async function deleteLiveCam(id: string) {
  await db.liveCam.deleteMany({ where: { id } });
}
