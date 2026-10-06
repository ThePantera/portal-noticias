import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_EDGE } from "./media";

/**
 * Sólo en el navegador. Las fotos de un celular suelen pesar más de lo que Vercel deja
 * subir: si el archivo es muy grande o de un formato que el servidor no acepta (HEIC del
 * iPhone, por ejemplo), se redibuja en JPEG a 2400 px de lado mayor como mucho. Las que
 * ya entran se suben tal cual, sin perder calidad.
 */
export async function prepareImageForUpload(file: File): Promise<Blob> {
  const accepted = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
  if (accepted && file.size <= MAX_UPLOAD_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("El navegador no pudo abrir esta imagen. Probá con un JPG o PNG.");
  }

  let scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(bitmap.width, bitmap.height));
  for (const quality of [0.86, 0.78, 0.7, 0.7, 0.7]) {
    const blob = await draw(bitmap, scale, quality);
    if (blob.size <= MAX_UPLOAD_BYTES) {
      bitmap.close();
      return blob;
    }
    if (quality === 0.7) scale *= 0.8;
  }
  bitmap.close();
  throw new Error("La imagen es demasiado pesada. Probá con otra.");
}

async function draw(bitmap: ImageBitmap, scale: number, quality: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no pudo procesar la imagen.");
  // JPEG no tiene transparencia: un PNG con fondo transparente queda sobre blanco, no negro.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("El navegador no pudo procesar la imagen."))),
      "image/jpeg",
      quality,
    ),
  );
}
