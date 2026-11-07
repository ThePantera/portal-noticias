import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { LIVE_CAMS_TAG } from "@/lib/cache-tags";
import { streamStatusFromWatchPage, watchUrl, type LiveCam } from "@/lib/live-cams";
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

/** ¿La transmisión está al aire? Se lee de la página del video; si no se puede, se usa el oEmbed. */
async function isWatchable(youtubeId: string): Promise<boolean> {
  try {
    const response = await fetch(watchUrl(youtubeId), {
      headers: {
        "Accept-Language": "es-AR,es;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
        Cookie: "CONSENT=YES+1",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const status = streamStatusFromWatchPage(await response.text());
      if (status !== "unknown") return status === "live";
    }
  } catch {
    // Sin respuesta de la página: decide el oEmbed.
  }
  return isEmbeddable(youtubeId);
}

/**
 * Las cámaras que están transmitiendo. Se revisan cada 15 minutos o al cambiar la lista en el
 * panel: las que terminaron o se cayeron no se muestran.
 */
export async function getPublicLiveCams(): Promise<LiveCam[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 });
  cacheTag(LIVE_CAMS_TAG);
  const cams = await listLiveCams();
  const checks = await Promise.all(cams.map((cam) => isWatchable(cam.youtubeId)));
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
