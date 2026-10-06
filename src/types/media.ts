/** Imágenes: lo que guarda la base y lo que reciben las páginas. Ver docs/adr/0005-media.md. */

export type ImageFormat = "jpeg" | "png" | "webp" | "avif";

/** Una copia redimensionada de la imagen. `purpose: "og"` es el recorte 1200×630 para redes. */
export type MediaVariant = {
  key: string;
  width: number;
  height: number;
  format: ImageFormat;
  sizeBytes: number;
  purpose?: "og";
};

/** Imagen lista para mostrar: direcciones públicas y textos. */
export type PublicImage = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: string | null;
  /** Recorte para Open Graph (JPEG 1200×630), o null si la imagen es más chica. */
  ogUrl: string | null;
};

/** Imagen tal como la maneja el editor. */
export type EditorImage = PublicImage & { id: string };

export type UploadImageResult = { ok: true; image: EditorImage } | { ok: false; message: string };
