# Portal Noticias

Portal de noticias digital con panel de administración propio, preparado para evolucionar hacia la ingesta automática, la asistencia con IA (siempre con revisión humana) y la distribución por eventos.

> **Estado:** Fase 1 (arquitectura y diseño) terminada. La aplicación todavía no existe; se construye en las Fases 2 a 12. Ver [la auditoría y propuesta](docs/00-auditoria-y-propuesta.md).

## Stack
Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Prisma 7 · Tailwind CSS 4 · Tiptap 3 · Zod · sharp · Vitest · Playwright. Justificación en [ADR 0001](docs/adr/0001-stack.md).

## Qué hay hoy
| Ruta | Contenido |
|---|---|
| `docs/00-auditoria-y-propuesta.md` | Auditoría, stack, arquitectura, modelo de datos, carpetas, auth, imágenes, SEO, automatización, roadmap y riesgos |
| `docs/adr/` | Decisiones de arquitectura |
| `docs/design/` | Identidad visual y vista previa HTML |
| `prisma/schema.prisma` | Modelo de datos (validado) |
| `prisma/migrations/` | Migración inicial con búsqueda en español |
| `src/styles/tokens.css` | Tokens de diseño en claro y oscuro |

## Base de datos (disponible desde ya)
Requisitos: Node 22+ y PostgreSQL 16 con la extensión `unaccent` (incluida en el paquete estándar de PostgreSQL).

```bash
cp .env.example .env          # completar DATABASE_URL
npm install
npm run db:validate           # valida el esquema
npm run db:deploy             # aplica las migraciones
```

## Variables de entorno
Ver `.env.example`. Ningún secreto va en el código.

## Comandos, desarrollo, producción y testing
Se documentan en la Fase 2, cuando exista la aplicación.

## Arquitectura en una línea
Páginas, panel y API → servicios (validación, permisos, transiciones, eventos) → Prisma → PostgreSQL, con un outbox de eventos (`domain_events`) que la automatización futura consume sin tocar el núcleo. Ver [ADR 0002](docs/adr/0002-capas.md) y [ADR 0006](docs/adr/0006-eventos.md).

## Futuras automatizaciones
Fuentes → ingesta → normalización → deduplicación → clasificación → IA → borrador → **revisión humana** → programación → publicación → distribución. La IA nunca publica: todo lo que genera entra como borrador. Ver la sección 11 de la propuesta.
