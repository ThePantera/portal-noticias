# Portal Noticias

Portal de noticias digital con panel de administración propio, preparado para evolucionar hacia la ingesta automática, la asistencia con IA (siempre con revisión humana) y la distribución por eventos.

> **Estado:** Fase 8 (SEO). Las notas se escriben, programan y publican desde `/admin`, y se leen en la portada, `/noticias/{slug}`, `/categoria/{slug}`, `/tag/{slug}` y `/buscar`. Para buscadores: `/sitemap.xml`, `/news-sitemap.xml` (últimas 48 horas, formato Google News), `/feed.xml` (RSS), `/robots.txt` y datos estructurados `NewsArticle`. Imágenes, seguridad y automatización llegan en las Fases 9 a 12. Ver [la auditoría y propuesta](docs/00-auditoria-y-propuesta.md).

## Stack

Next.js 16 · React 19 · TypeScript · PostgreSQL 16 · Prisma 7 · Tailwind CSS 4 · Tiptap 3 · Zod · sharp · Vitest · Playwright. Justificación en [ADR 0001](docs/adr/0001-stack.md).

## Requisitos

Node 22 o superior y PostgreSQL 16 con la extensión `unaccent` (viene en el paquete estándar). Con Docker: `docker compose up -d` levanta una base lista para usar.

## Instalación

```bash
cp .env.example .env          # completar DATABASE_URL y el resto
npm install
npm run db:deploy             # aplica las migraciones
npm run db:seed               # crea las 10 categorías iniciales
npm run db:seed:demo          # opcional: notas de ejemplo (sólo desarrollo)
npm run admin:create          # crea tu usuario de administrador
npm run dev                   # http://localhost:3000, panel en /admin
```

## Variables de entorno

Están todas en `.env.example`, sin valores reales. Ningún secreto va en el código. La aplicación valida las variables al arrancar (`src/server/env.ts`) y se detiene con un mensaje claro si falta alguna.

## Comandos

| Comando                                            | Qué hace                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`                                      | Servidor de desarrollo                                                                 |
| `npm run build` / `npm start`                      | Compilación y servidor de producción (el build lee la base: necesita `DATABASE_URL`)   |
| `npm run lint`                                     | ESLint, incluidas las reglas de capas                                                  |
| `npm run typecheck`                                | Genera los tipos de rutas y corre `tsc`                                                |
| `npm run format` / `format:check`                  | Prettier                                                                               |
| `npm test`                                         | Tests unitarios (Vitest, sin base)                                                     |
| `npm run test:integration`                         | Tests contra PostgreSQL real en `TEST_DATABASE_URL` (la base se borra en cada corrida) |
| `npm run check`                                    | Lint + typecheck + formato + tests                                                     |
| `npm run db:validate` / `db:migrate` / `db:deploy` | Prisma: validar, crear migración en desarrollo, aplicar en producción                  |
| `npm run db:seed` / `db:seed:demo`                 | Categorías iniciales / notas de ejemplo (idempotentes)                                 |
| `npm run db:bootstrap`                             | Base vacía: categorías y administrador desde `ADMIN_*` (corre en cada deploy)          |
| `npm run jobs:publish-scheduled`                   | Publica las notas programadas vencidas (lo mismo que hace el cron)                     |

## Base de datos

- Esquema: `prisma/schema.prisma`; migraciones en `prisma/migrations/`. El cliente se genera en `src/generated/prisma` al instalar (`postinstall`).
- El código de la app usa `db` de `src/server/db.ts` (Prisma 7 con `@prisma/adapter-pg`).
- La búsqueda usa una columna `search_vector` mantenida por un trigger. Ver [ADR 0003](docs/adr/0003-modelo-de-datos.md).
- Las categorías iniciales salen de `prisma/data/categories.ts` y después se administran desde el panel; el seed nunca pisa cambios.
- Docker Compose crea `portal_dev` y `portal_test`.

## Autenticación

- No hay registro público: el administrador se crea con `npm run admin:create` desde el servidor.
- Sesiones en base de datos con cookie `httpOnly`; en la base se guarda sólo el SHA-256 del token. Contraseñas con argon2id, mínimo 12 caracteres.
- Tras 5 intentos fallidos por email (o 20 por IP) en 15 minutos, el login se bloquea por 15 minutos.
- Toda página, Server Action y Route Handler del panel valida la sesión contra la base con `requireUser()` / `requirePermission()`. `src/proxy.ts` sólo redirige: no es la barrera de seguridad.
- Si perdés la contraseña: `npm run admin:reset-password`.
  Ver [ADR 0004](docs/adr/0004-autenticacion.md).

## Producción

El portal se publica en Vercel con la base en Neon: la guía paso a paso está en [docs/deploy-vercel.md](docs/deploy-vercel.md). En cada deploy, `npm run vercel-build` aplica las migraciones, prepara la base si está vacía (`npm run db:bootstrap`) y compila. Fuera de Vercel: `npm run db:deploy && npm run db:bootstrap && npm run build && npm start` detrás de un proxy con HTTPS. `/api/health` responde 200 si la aplicación y la base responden, y 503 si la base no contesta.

El build prerenderiza la portada, las secciones y las notas más recientes leyendo la base, así que corre después de las migraciones. Las páginas públicas se guardan en caché y cada cambio de una nota (guardar, publicar, despublicar, archivar o el publicador automático) la invalida: lo publicado se ve en el acto. Sólo las notas en estado PUBLISHED llegan al sitio público.

## Testing y CI

GitHub Actions (`.github/workflows/ci.yml`) corre en cada PR, sobre un PostgreSQL 16 real: valida el esquema, aplica las migraciones, comprueba que no haya diferencias entre esquema y base, corre los seeds dos veces (para comprobar que no duplican) y corre lint, typecheck, formato, tests unitarios, tests de integración, build y tests end to end en navegador.

## Documentación

- [Auditoría y propuesta](docs/00-auditoria-y-propuesta.md): stack, arquitectura, modelo de datos, auth, imágenes, SEO, automatización, roadmap y riesgos.
- [Decisiones de arquitectura](docs/adr/).
- [Identidad visual](docs/design/identidad-visual.md) y su [vista previa](docs/design/preview.html).

## Arquitectura en una línea

Páginas, panel y API → servicios (validación, permisos, transiciones, eventos) → Prisma → PostgreSQL, con un outbox de eventos (`domain_events`) que la automatización futura consume sin tocar el núcleo. Ver [ADR 0002](docs/adr/0002-capas.md) y [ADR 0006](docs/adr/0006-eventos.md).

## Futuras automatizaciones

Fuentes → ingesta → normalización → deduplicación → clasificación → IA → borrador → **revisión humana** → programación → publicación → distribución. La IA nunca publica: todo lo que genera entra como borrador. Ver la sección 11 de la propuesta.
