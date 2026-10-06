# ADR 0003: Modelo de datos

**Estado:** aceptado y verificado (6 oct 2026)

## Decisiones

- **Contenido como JSON de Tiptap** + `contentText` derivado. Ni HTML libre, ni todo en un único campo de texto.
- **Estados** `DRAFT | SCHEDULED | PUBLISHED | ARCHIVED`. El público sólo ve PUBLISHED con `publishedAt <= now()`.
- **Transiciones permitidas:** DRAFT → SCHEDULED | PUBLISHED | ARCHIVED; SCHEDULED → DRAFT | PUBLISHED; PUBLISHED → DRAFT (despublicar) | ARCHIVED; ARCHIVED → DRAFT. Cualquier otra transición se rechaza en el servicio.
- **Destacadas por `featuredRank`** en vez de un booleano, para ordenar la portada.
- **`origin`** (MANUAL, IMPORTED, AI_ASSISTED) preparado para la automatización.
- **`article_slug_history`** para redirecciones 301.
- **Búsqueda:** `search_vector` tsvector con trigger e índice GIN, diccionario `spanish` y `f_unaccent` (un wrapper IMMUTABLE de `unaccent`).
- **Borrado:** las notas se borran de verdad (lo pidió el propietario). Antes de borrar se emite `ARTICLE_DELETED` con una instantánea mínima (id, slug, título), para que los consumidores futuros puedan limpiar lo que hayan distribuido.

## Por qué un trigger y no una columna GENERATED

Se probó primero con una columna `GENERATED ALWAYS AS (...) STORED`. `prisma migrate diff` detectó una diferencia y propuso `ALTER COLUMN "search_vector" DROP DEFAULT`, que PostgreSQL rechaza en columnas generadas. Eso habría roto cada migración futura. Con el trigger, el diff queda vacío (verificado).
