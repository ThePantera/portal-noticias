"use server";

import { refresh, updateTag } from "next/cache";
import { ARTICLES_TAG, articleTag } from "@/lib/cache-tags";
import { requireUser } from "@/server/auth/current-user";
import {
  ExtrasError,
  addGalleryImage,
  addLiveUpdate,
  deleteLiveUpdate,
  moveGalleryImage,
  removeGalleryImage,
  setLive,
} from "@/server/services/article-extras";
import type { ExtrasResult } from "@/types/admin";

/** Corre un cambio de la cobertura o la galería y renueva la nota publicada. */
async function run(articleId: () => Promise<string>): Promise<ExtrasResult> {
  try {
    const id = await articleId();
    updateTag(ARTICLES_TAG);
    updateTag(articleTag(id));
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof ExtrasError) return { ok: false, message: error.message };
    console.error("Cobertura o galería: error inesperado", error);
    return { ok: false, message: "No se pudo guardar. Probá de nuevo en unos segundos." };
  }
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function setLiveAction(formData: FormData): Promise<ExtrasResult> {
  const user = await requireUser();
  const id = text(formData, "articleId");
  return run(async () => {
    await setLive(user, id, text(formData, "isLive") === "true");
    return id;
  });
}

export async function addLiveUpdateAction(formData: FormData): Promise<ExtrasResult> {
  const user = await requireUser();
  const id = text(formData, "articleId");
  return run(async () => {
    await addLiveUpdate(user, id, text(formData, "body"));
    return id;
  });
}

export async function deleteLiveUpdateAction(formData: FormData): Promise<ExtrasResult> {
  const user = await requireUser();
  return run(() => deleteLiveUpdate(user, text(formData, "updateId")));
}

export async function addGalleryImageAction(formData: FormData): Promise<ExtrasResult> {
  const user = await requireUser();
  const id = text(formData, "articleId");
  return run(async () => {
    await addGalleryImage(user, id, {
      mediaId: text(formData, "mediaId"),
      alt: text(formData, "alt"),
      caption: text(formData, "caption"),
      credit: text(formData, "credit"),
    });
    return id;
  });
}

export async function removeGalleryImageAction(formData: FormData): Promise<ExtrasResult> {
  const user = await requireUser();
  const id = text(formData, "articleId");
  return run(async () => {
    await removeGalleryImage(user, id, text(formData, "mediaId"));
    return id;
  });
}

export async function moveGalleryImageAction(formData: FormData): Promise<ExtrasResult> {
  const user = await requireUser();
  const id = text(formData, "articleId");
  const step = text(formData, "step") === "-1" ? -1 : 1;
  return run(async () => {
    await moveGalleryImage(user, id, text(formData, "mediaId"), step);
    return id;
  });
}
