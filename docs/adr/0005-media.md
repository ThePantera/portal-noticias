# ADR 0005: Media e imágenes

**Estado:** aceptado (6 oct 2026). Reemplaza la propuesta inicial del mismo día.

## Contexto

El portal se despliega en Vercel, cuyo disco se borra en cada deploy y cuyas funciones aceptan pedidos de hasta 4,5 MB. Las fotos de un celular suelen pesar más que eso.

## Decisión

- **Proveedor intercambiable.** Interfaz `StorageDriver { put, delete, publicUrl }` en `src/server/media/storage.ts`. Hay dos: `local` (disco, servido por `/media/[...key]`, sólo para desarrollo y tests) y `vercel-blob`. Se elige con `STORAGE_DRIVER`; vacío usa Vercel Blob si está `BLOB_READ_WRITE_TOKEN` o `BLOB_STORE_ID` (conexión por OIDC, la que usa Vercel en cuentas nuevas). En Vercel sin Blob la subida se rechaza con un mensaje claro en vez de guardar en un disco que se borra. Sumar S3 o Cloudflare R2 es escribir otro driver.
- **La base guarda el proveedor y la clave, nunca la URL.** La dirección pública se arma al leer. `MEDIA_PUBLIC_BASE_URL` permite poner un CDN o un dominio propio delante sin migrar datos. Con Vercel Blob la base sale del id del store que viene en el token.
- **Claves únicas e inmutables:** `media/AAAA/MM/<uuid>/original.jpg`, `w480.webp`, … Nunca se sobrescriben, así que se sirven con caché de un año.
- **Validación en el servidor**, aunque el navegador ya haya preparado el archivo: máximo 4 MB, formato detectado por los bytes (JPEG, PNG, WebP, AVIF; SVG, GIF y HEIC no), decodificación completa con sharp (un archivo dañado o disfrazado falla), tope de 40 MP, al menos 320 px de ancho. Se endereza según la orientación de la cámara y se vuelve a codificar sin metadatos (EXIF, GPS).
- **El navegador achica antes de subir** (`src/lib/image-prep.ts`): si el archivo pesa más de 4 MB o es de un formato que el servidor no acepta (HEIC), lo redibuja en JPEG a 2400 px de lado mayor. Los que ya entran se suben tal cual.
- **Variantes:** WebP de 480, 960, 1600 y 2400 px (sin agrandar) en `media.variants`, y un recorte JPEG de 1200×630 para Open Graph (`purpose: "og"`), porque no todas las redes leen WebP.
- **Las páginas usan `<img srcset sizes>`**, no `next/image`: las variantes ya existen y así no se consume la cuota de optimización de imágenes de Vercel. La foto principal de cada página va con `fetchpriority="high"`; el resto, con carga diferida.
- **Imagen principal:** se sube apenas se elige (para verla enseguida) y se engancha a la nota al guardar, junto con descripción, epígrafe y crédito, que viven en la fila de `media`. Publicar una nota con foto exige la descripción (accesibilidad y SEO).

## Consecuencias

- Una imagen subida y nunca guardada en una nota queda sin uso. Falta una tarea que limpie las huérfanas viejas (pendiente para la fase de automatización).
- Imágenes dentro del cuerpo de la nota y galería (`article_media`) usan la misma subida; la interfaz para insertarlas queda para una etapa siguiente.
- Cambiar de proveedor más adelante no rompe nada: cada fila sabe en qué proveedor está.
