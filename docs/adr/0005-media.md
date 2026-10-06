# ADR 0005: Media e imágenes

**Estado:** propuesto (6 oct 2026)

## Decisión
- Interfaz `StorageDriver { put, delete, getUrl }`. Hoy `local` (`storage/`); luego `s3` (S3, R2, MinIO), elegido con `STORAGE_DRIVER`.
- La base guarda `storageDriver` y `storageKey`, nunca URLs absolutas. La URL pública se arma con `MEDIA_PUBLIC_BASE_URL`, lo que permite poner un CDN delante sin migrar datos.
- Validación: tipo detectado por los bytes del archivo (JPEG, PNG, WebP, AVIF; SVG no), máximo 10 MB y 40 MP, decodificación con sharp, eliminación de EXIF, nombre generado por el servidor.
- Variantes WebP de 480, 960, 1600 y 2400 px guardadas en `media.variants`. Las páginas usan `srcset`/`sizes` con `width` y `height` reales.

## Consecuencias
El almacenamiento local no sirve en plataformas serverless con disco efímero (Vercel). Si se despliega ahí, se usa `s3` desde el primer día.
