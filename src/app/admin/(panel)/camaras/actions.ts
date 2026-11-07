"use server";

import { refresh, updateTag } from "next/cache";
import { LIVE_CAMS_TAG } from "@/lib/cache-tags";
import { parseYouTubeId } from "@/lib/live-cams";
import { requirePermission } from "@/server/auth/current-user";
import { addLiveCam, deleteLiveCam } from "@/server/services/live-cams";

export type CamFormState = { error?: string; ok?: string };

export async function addCamAction(_prev: CamFormState, formData: FormData): Promise<CamFormState> {
  await requirePermission("article:publish");
  const title = String(formData.get("title") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();
  const youtubeId = parseYouTubeId(String(formData.get("link") ?? ""));
  if (!youtubeId) return { error: "Pegá el enlace de una transmisión de YouTube." };
  if (!title || title.length > 80) return { error: "Poné un nombre de hasta 80 caracteres." };
  if (!place || place.length > 80) return { error: "Poné el lugar (hasta 80 caracteres)." };
  await addLiveCam({ title, place, youtubeId });
  updateTag(LIVE_CAMS_TAG);
  refresh();
  return { ok: "Cámara agregada." };
}

export async function deleteCamAction(formData: FormData): Promise<void> {
  await requirePermission("article:publish");
  await deleteLiveCam(String(formData.get("id") ?? ""));
  updateTag(LIVE_CAMS_TAG);
  refresh();
}
