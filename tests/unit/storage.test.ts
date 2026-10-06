import { describe, expect, it } from "vitest";
import { blobCredentials, vercelBlobDriver } from "@/server/media/storage";

describe("credenciales de Vercel Blob", () => {
  it("lee el token estándar y saca el id del store", () => {
    expect(blobCredentials({ BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_AbC123_secreto" })).toEqual({
      token: "vercel_blob_rw_AbC123_secreto",
      storeId: "AbC123",
    });
  });

  it("encuentra el token aunque la variable tenga otro prefijo", () => {
    expect(blobCredentials({ PORTAL_IMAGENES_READ_WRITE_TOKEN: "vercel_blob_rw_xyz_s" }).storeId).toBe("xyz");
  });

  it("sin token usa BLOB_STORE_ID (conexión con OIDC)", () => {
    expect(blobCredentials({ BLOB_STORE_ID: "store_Qw3rTy" })).toEqual({
      token: undefined,
      storeId: "Qw3rTy",
    });
  });

  it("sin nada no hay credenciales", () => {
    expect(blobCredentials({})).toEqual({ token: undefined, storeId: undefined });
  });

  it("arma la dirección pública con el id del store en minúsculas", () => {
    const driver = vercelBlobDriver({ storeId: "Qw3rTy" });
    expect(driver.publicUrl("media/2026/10/x/w960.webp")).toBe(
      "https://qw3rty.public.blob.vercel-storage.com/media/2026/10/x/w960.webp",
    );
  });
});
