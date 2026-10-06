import "server-only";
import { buildSrcSet, pickVariant } from "@/lib/media";
import type { MediaVariant, PublicImage } from "@/types/media";
import { getStorageDriver } from "./storage";

/** Columnas de `media` que hacen falta para mostrar una imagen. */
export const imageSelect = {
  storageDriver: true,
  storageKey: true,
  width: true,
  height: true,
  altText: true,
  caption: true,
  credit: true,
  variants: true,
} as const;

export type ImageRow = {
  storageDriver: string;
  storageKey: string;
  width: number;
  height: number;
  altText: string;
  caption: string | null;
  credit: string | null;
  variants: unknown;
};

function readVariants(value: unknown): MediaVariant[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is MediaVariant =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as MediaVariant).key === "string" &&
      typeof (v as MediaVariant).width === "number" &&
      typeof (v as MediaVariant).height === "number",
  );
}

/** Convierte una fila de `media` en las direcciones públicas que usan las páginas. */
export function toPublicImage(row: ImageRow): PublicImage {
  const driver = getStorageDriver(row.storageDriver);
  const variants = readVariants(row.variants);
  const main = pickVariant(variants);
  const og = variants.find((v) => v.purpose === "og");
  return {
    src: driver.publicUrl(main?.key ?? row.storageKey),
    srcSet: buildSrcSet(variants, driver.publicUrl),
    width: main?.width ?? row.width,
    height: main?.height ?? row.height,
    alt: row.altText,
    caption: row.caption,
    credit: row.credit,
    ogUrl: og ? driver.publicUrl(og.key) : null,
  };
}
