# Portal de Noticias: auditoría y propuesta (Fase 0 y Fase 1)

Fecha: 6 de octubre de 2026. Estado de cada afirmación: **VERIFICADO** (se ejecutó y se vio el resultado), **IMPLEMENTADO** (escrito, sin prueba de comportamiento todavía) o **PENDIENTE**.

---

## 1. Auditoría del proyecto actual

| Qué se revisó | Resultado |
|---|---|
| Repositorios de GitHub de `ThePantera` (10 repos) | Ninguno es un portal de noticias. Los más recientes son `mi-portfolio`, `BarberiaPOS`, `ManuPrestamos`, `aura-luxury*`, `LUXERY-PERFUM*`. **VERIFICADO** con el listado de repos. |
| Carpeta compartida del proyecto | Vacía antes de esta fase. **VERIFICADO**. |
| Carpetas del dispositivo del usuario | No hay ninguna carpeta conectada a este proyecto. **VERIFICADO**. |
| `package.json`, configuración, `.env`, rutas, backend, base de datos, scripts | No existen: no hay código previo. |

**Conclusión:** se parte de cero. No hay código que preservar ni riesgo de sobrescribir nada. La regla de "no destruir" aplica desde ahora sobre lo que se vaya construyendo.

Entorno disponible para desarrollar y verificar: Node 22.22, npm 10.9, PostgreSQL 16.15 (con la extensión `unaccent`), Chromium con Playwright para pruebas de navegador. **VERIFICADO**.

## 2. Qué existe

- Requisitos completos del producto (el mensaje inicial del proyecto).
- Desde esta fase: el modelo de datos validado, la migración inicial, los tokens de diseño y la propuesta visual (ver "Fase 1 entregada" al final).

## 3. Qué falta

Todo el producto: base Next.js, autenticación, panel, CRUD, editor, media, frontend público, SEO, tests, CI y despliegue. Además faltan dos decisiones del propietario:

1. **Nombre del portal y dominio** (afecta logo, metadatos, canonical, sitemap y datos estructurados). Uso "Portal Noticias" como provisorio.
2. **Dónde se despliega** (afecta la estrategia de imágenes y del programador de publicaciones; ver riesgos).

## 4. Stack propuesto

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript estricto** | SSR/ISR para SEO y velocidad, Server Components para mandar poco JavaScript al lector, Route Handlers y Server Actions para el backend sin un servidor aparte. |
| Base de datos | **PostgreSQL 16** | Relacional, robusta, con búsqueda de texto completo en español incorporada (evita sumar Elasticsearch/Algolia en el MVP). |
| ORM | **Prisma 7.10** (última estable; la etiqueta `latest` de npm apunta a una 8.0 RC, que descarto) | Esquema tipado, migraciones versionadas, cliente generado. |
| Estilos | **Tailwind CSS v4** alimentado por tokens CSS propios | Sin hojas de estilo sueltas; los tokens viven en un único archivo y Tailwind los expone. |
| Editor | **Tiptap 3** (sobre ProseMirror) | Editor estructurado: guarda JSON, no HTML libre. Eso permite renderizar seguro y procesar contenido con IA más adelante. |
| Autenticación | **Sesiones propias en base de datos + argon2id** (`@node-rs/argon2`) | Ver punto 8. |
| Validación | **Zod 4** | Un esquema por entrada, compartido entre formulario y servidor. |
| Imágenes | **sharp** | Validación real del archivo, redimensionado y WebP/AVIF. |
| Tests | **Vitest** (unitarios e integración contra PostgreSQL real) + **Playwright** (end to end) | Ver Fase 10. |
| Calidad | ESLint + Prettier + `tsc --noEmit` | Se corren en cada verificación y en CI. |
| Local | Docker Compose para PostgreSQL | Mismo motor en desarrollo y producción. |

Dependencias que **no** agrego: NextAuth/Auth.js (ver punto 8), un CMS headless (el panel propio es parte del producto), Redux u otro manejo de estado global (no hace falta), librerías de componentes completas (el diseño es propio).

## 5. Arquitectura

Monolito modular: una sola aplicación Next.js, con las cinco responsabilidades separadas por carpeta y por reglas de dependencia.

```
            ┌────────────────────────── Next.js ──────────────────────────┐
 Lector ──► │ PRESENTACIÓN  app/(public)  ─┐                              │
            │                              ├─► SERVICIOS (server/services)│──► Prisma ──► PostgreSQL
 Editor ──► │ ADMINISTRACIÓN app/admin    ─┘     │  validación (zod)      │
            │ API            app/api   ──────────┘  permisos (can())      │
            │                                     eventos (outbox) ───────┼──► tabla domain_events
            └─────────────────────────────────────────────────────────────┘          │
                                                                                     ▼
                             AUTOMATIZACIÓN FUTURA (procesos aparte): workers, cron, ingesta, IA, distribución
```

Reglas:

- **Las páginas no hablan con la base de datos.** Páginas, Server Actions y Route Handlers llaman a `server/services/*`. Los servicios son el único lugar con lógica de negocio: transiciones de estado, slugs, permisos y eventos. Así la misma regla vale para el panel, la API y un worker futuro.
- **Todo cambio de estado de una nota emite un evento** en la misma transacción (patrón outbox). Ver punto 11.
- **El código de servidor está marcado con `server-only`** para que nunca termine en el bundle del navegador.
- **El estado público lo decide el backend:** las consultas públicas filtran siempre `status = PUBLISHED` y `publishedAt <= ahora`. Ocultar URLs no es protección.
- **Caché:** las páginas públicas usan ISR con etiquetas (`revalidateTag`). Al publicar, editar o archivar, el servicio invalida exactamente las etiquetas afectadas (la nota, su categoría, la portada, el sitemap).

Decisiones detalladas en `docs/adr/`.

## 6. Modelo de datos

Archivo: `prisma/schema.prisma`. Migración: `prisma/migrations/20261006123311_init/`.

| Tabla | Para qué |
|---|---|
| `users` | Usuarios con `role` (ADMIN, EDITOR, AUTHOR, CONTRIBUTOR). En el MVP sólo hay un ADMIN. |
| `sessions` | Sesiones de servidor; el id es el hash SHA-256 del token de la cookie. |
| `login_attempts` | Límite de intentos por email e IP. |
| `categories` | Configurables desde el panel: nombre, slug, orden, visible en menú, SEO. |
| `tags` + `article_tags` | Etiquetas N a N. |
| `articles` | Nota: título, slug, bajada, contenido (JSON del editor) y su texto plano, estado, origen, tiempo de lectura, rango de destacada, SEO, imagen principal y OG, fechas de creación, actualización, publicación, programación y archivo. |
| `article_media` | Imágenes adicionales ordenadas (galería). |
| `article_slug_history` | Slugs anteriores para redirigir con 301 si cambia el título de una nota publicada. |
| `media` | Imágenes: proveedor de almacenamiento, clave, tipo, peso, dimensiones, alt, epígrafe, crédito y variantes. |
| `domain_events` | Outbox de eventos para la automatización futura. |

Detalles que importan:

- **Destacadas:** `featuredRank` (null = no destacada, 1 = nota principal, 2 en adelante = secundarias). Así la portada tiene jerarquía editorial explícita en vez de "las últimas N".
- **Contenido:** el JSON del editor es la fuente de verdad. `contentText` es texto plano derivado, que se usa para buscar, calcular el tiempo de lectura y, más adelante, alimentar a la IA.
- **Origen:** `origin` (MANUAL, IMPORTED, AI_ASSISTED) existe desde el día uno. Una nota creada por la IA o por ingesta entra como DRAFT y necesita una persona para publicarse.
- **Búsqueda:** columna `search_vector` (tsvector) con pesos: título A, bajada B, cuerpo C, diccionario `spanish`, sin acentos, con índice GIN. La mantiene un trigger de PostgreSQL. Usé un trigger en lugar de una columna `GENERATED` porque Prisma la detecta como diferencia y propone un `ALTER` inválido en cada migración nueva (**VERIFICADO**: lo probé, lo vi fallar y lo cambié). Las búsquedas por categoría y por tag se resuelven con joins a sus tablas.
- **Integridad:** no se puede borrar una categoría con notas (`Restrict`); borrar una nota borra sus tags y su galería, pero no las imágenes de la biblioteca.

## 7. Estructura de carpetas

```
portal-noticias/
├── prisma/                    schema.prisma, migrations/, seed.ts
├── prisma.config.ts
├── docs/                      esta propuesta, adr/, design/
├── public/                    estáticos (favicon, logo)
├── storage/                   archivos subidos en desarrollo (fuera de git)
├── src/
│   ├── app/
│   │   ├── (public)/          portada, noticias/[slug], categoria/[slug], tag/[slug], buscar
│   │   ├── admin/             login, dashboard, notas, categorías, tags, media
│   │   ├── api/               route handlers: media, cron/publish-scheduled, health
│   │   ├── sitemap.ts, robots.ts, not-found.tsx, error.tsx
│   ├── components/
│   │   ├── ui/                botones, inputs, chips (sin lógica de negocio)
│   │   ├── editorial/         ArticleCard, LeadStory, SectionBlock, Byline, ShareBar, ArticleBody
│   │   └── admin/             ArticleForm, Editor, MediaPicker, StatusBadge
│   ├── server/                sólo servidor ("server-only")
│   │   ├── db.ts              cliente Prisma
│   │   ├── auth/              sesiones, hashing, rate limit, guards
│   │   ├── permissions.ts     can(user, acción, recurso)
│   │   ├── services/          articles, categories, tags, media, search, publishing
│   │   ├── events/            tipos de evento, emisor outbox, despachador
│   │   ├── storage/           StorageDriver: local (ahora), s3 (futuro)
│   │   └── jobs/              publishScheduled y futuros jobs
│   ├── lib/                   código puro y compartido: slug, fechas, SEO, render del contenido
│   ├── types/                 tipos de dominio compartidos
│   ├── styles/                tokens.css, globals.css
│   └── generated/prisma/      cliente generado (fuera de git)
└── tests/
    ├── unit/                  slug, permisos, transiciones de estado, render seguro
    ├── integration/           servicios contra PostgreSQL de test
    └── e2e/                   Playwright: login, crear, programar, publicar, buscar
```

`lib/` no importa nada de `server/`. `components/` no importa `server/` salvo en Server Components de página. Una regla de ESLint lo hace cumplir.

## 8. Estrategia de autenticación

- **Sesiones en base de datos con cookie `httpOnly`, `Secure`, `SameSite=Lax`**, token aleatorio de 32 bytes; en la base se guarda sólo su SHA-256. Duración de 30 días con renovación deslizante. Cerrar sesión borra la fila.
- **Contraseñas con argon2id**, nunca en texto plano, con mínimo de 12 caracteres.
- **Límite de intentos:** 5 fallidos por email o 20 por IP cada 15 minutos (tabla `login_attempts`). El mensaje de error es siempre el mismo ("Email o contraseña incorrectos"), para no revelar qué emails existen.
- **Protección en tres capas:** el `proxy` de Next.js (antes `middleware`) redirige a `/admin/login` si no hay cookie; esto es comodidad, no seguridad. La seguridad real está en cada Server Action, Route Handler y página de admin, que llaman a `requireUser()` y luego a `can(user, acción)`, que valida la sesión contra la base. Las Server Actions de Next ya verifican el origen de la petición, lo que protege contra CSRF; los Route Handlers que modifican datos verifican el header `Origin`.
- **Roles preparados:** `can()` es una tabla de permisos por rol. Hoy ADMIN puede todo. Sumar un AUTHOR que sólo edita sus borradores significa agregar filas a esa tabla, no reescribir el panel.
- **Alta del primer administrador:** con el comando `npm run admin:create`, que pide email y contraseña por consola. No hay registro público ni contraseñas por defecto.

**Por qué no Auth.js:** su proveedor de credenciales sólo funciona con sesiones JWT, que no se pueden revocar desde el servidor, y la documentación lo desaconseja. Para un único administrador con email y contraseña, unas 150 líneas propias y probadas son más simples y seguras. Si más adelante hace falta login con Google, se puede sumar Better Auth reutilizando la tabla `users`.

## 9. Estrategia de imágenes

- **Interfaz `StorageDriver`** (`put`, `delete`, `getUrl`). Hoy: `LocalDiskDriver` (guarda en `storage/`, servido por una ruta propia). Mañana: `S3Driver`, compatible con AWS S3, Cloudflare R2, Backblaze o MinIO, elegido por variable de entorno. La base guarda `storageDriver` y `storageKey`, nunca URLs absolutas, así que cambiar de proveedor o sumar un CDN no requiere tocar datos.
- **Validación al subir:** el tipo se lee de los bytes del archivo, no de la extensión ni del header (se aceptan JPEG, PNG, WebP y AVIF; no se acepta SVG porque puede llevar scripts). Límite de 10 MB y 40 megapíxeles. sharp decodifica la imagen; si falla, se rechaza. Se eliminan los metadatos EXIF, que pueden incluir la ubicación GPS. El nombre del archivo lo genera el servidor.
- **Variantes:** al subir se generan versiones WebP de 480, 960, 1600 y 2400 px de ancho (nunca más grandes que el original) y se guardan en `media.variants`. El frontend arma `srcset` y `sizes` con esas variantes y muestra `width`/`height` reales para evitar saltos de diseño (CLS). AVIF y un procesamiento en segundo plano quedan para la Fase 11.
- **Edición:** cada imagen tiene alt, epígrafe y crédito, que son obligatorios en la práctica periodística. La imagen OG usa la imagen principal si no se elige otra.

## 10. Estrategia de SEO

- URLs: `/noticias/{slug}`, `/categoria/{slug}`, `/tag/{slug}`, `/buscar?q=`. El slug se genera del título: minúsculas, sin acentos ni signos, guiones, máximo 80 caracteres y único (si ya existe, se agrega `-2`, `-3`…). Al cambiar el slug de una nota publicada, el anterior queda en `article_slug_history` y redirige con 301.
- Metadatos con `generateMetadata` de Next: `title` (SEO title o título), `description` (SEO description o bajada), `alternates.canonical`, Open Graph `type=article` con `published_time`, `modified_time`, `section` y `tag`, y Twitter `summary_large_image`.
- Datos estructurados JSON-LD: `NewsArticle` en cada nota, `BreadcrumbList`, y `Organization` + `WebSite` con `SearchAction` en la portada.
- `sitemap.xml` dinámico con notas publicadas, categorías y tags; `news-sitemap.xml` con las notas de las últimas 48 horas (formato de Google News); `robots.txt` que bloquea `/admin`, `/api` y `/buscar`.
- HTML semántico: `header`, `nav`, `main`, `article`, `time datetime`, un único `h1` por página y migas de pan.
- Las páginas de categoría y tag paginan con enlaces reales, sin scroll infinito.
- Las notas en DRAFT, SCHEDULED o ARCHIVED devuelven 404 al público. La vista previa del admin lleva `noindex`.

## 11. Preparación para la automatización futura

**Eventos (implementación en Fase 6, contrato definido ahora):**

| Evento | Cuándo |
|---|---|
| `ARTICLE_CREATED` | Se crea una nota (cualquier origen). |
| `ARTICLE_UPDATED` | Cambia el contenido o los metadatos. |
| `ARTICLE_SCHEDULED` | Pasa a SCHEDULED con fecha futura. |
| `ARTICLE_PUBLISHED` | Pasa a PUBLISHED (manual o por programación). |
| `ARTICLE_UNPUBLISHED` | Vuelve de PUBLISHED a DRAFT. |
| `ARTICLE_ARCHIVED` | Pasa a ARCHIVED. |
| `ARTICLE_DELETED` | Se elimina. |

- El servicio de notas escribe el cambio y su evento **en la misma transacción** (outbox). Si la transacción falla, no queda un evento fantasma; si se confirma, el evento no se pierde.
- Un **despachador** (`server/events/dispatcher.ts`) lee eventos sin procesar y llama a los manejadores registrados, con reintentos (`attempts`, `lastError`). En el MVP no hay manejadores externos: sólo se invalida la caché. Sumar Telegram significa escribir un manejador para `ARTICLE_PUBLISHED`, sin tocar el servicio de notas.
- **Programación:** el servicio `publishDueArticles()` pasa a PUBLISHED las notas SCHEDULED con `scheduledAt <= ahora`. Es idempotente y usa `UPDATE ... WHERE status = 'SCHEDULED'`, así que dos ejecuciones simultáneas no publican dos veces. Se dispara cada minuto desde `POST /api/cron/publish-scheduled`, protegido con `CRON_SECRET` (desde el cron del servidor, Vercel Cron o GitHub Actions), y también existe como comando (`npm run jobs:publish-scheduled`). El paso a un worker dedicado no requiere cambiar el servicio.
- **Pipeline futuro** (Fuentes → Ingesta → Normalización → Deduplicación → Clasificación → IA → Borrador → Revisión humana → Programación → Publicación → Distribución): se sumarán tablas `sources`, `ingested_items` (con hash de contenido para deduplicar) y `ai_suggestions`, más procesos aparte que usen los mismos servicios. **Regla fija:** cualquier nota generada por la IA o por ingesta entra como DRAFT con `origin` distinto de MANUAL, y `publish()` exige un usuario humano con permiso. La IA no publica.
- **Analytics:** no se implementa ahora. Queda prevista una tabla `article_views` diaria (vistas agregadas por nota y día, sin datos personales) y el componente de nota ya tendrá un punto de enganche para el registro de vistas.

## 12. Roadmap

| Fase | Contenido | Criterio de terminado (verificado) |
|---|---|---|
| 0 | Auditoría | Este documento. **Hecha.** |
| 1 | Arquitectura + diseño | ADRs, esquema validado, tokens, propuesta visual revisada en 3 tamaños. **Hecha.** |
| 2 | Base del proyecto | Next.js + TS + Tailwind con tokens, ESLint/Prettier, Docker Compose, `.env.example`, CI de GitHub Actions. `build`, `lint` y `typecheck` en verde. |
| 3 | Base de datos | Migración aplicada, cliente Prisma, seed con las 10 categorías y notas de ejemplo. Tests de integración contra PostgreSQL. |
| 4 | Autenticación | Login, logout, rate limit, `requireUser`/`can`, `admin:create`. Tests: contraseña incorrecta, sesión vencida, acceso sin sesión a cada ruta de admin. |
| 5 | Panel | Layout del admin y dashboard con conteos por estado y acciones rápidas. |
| 6 | CRUD de notas | Formulario con Tiptap, slug, categoría, tags, imágenes, SEO, borrador, programar, publicar, despublicar, archivar y eliminar, más outbox. Tests de cada transición. |
| 7 | Frontend público | Portada editorial, nota, categoría, tag, búsqueda, relacionadas y compartir. Estados vacíos y 404. |
| 8 | SEO | Metadatos, JSON-LD, sitemaps y robots, verificados sobre el HTML generado. |
| 9 | Responsive + UX | Revisión con Playwright en 390, 820 y 1440 px, en ambos temas. |
| 10 | Testing + seguridad | Recorrido E2E completo de los 18 pasos del resultado esperado, auditoría de dependencias, cabeceras CSP. |
| 11 | Optimización | Lighthouse y Core Web Vitals, AVIF, ajuste de caché. |
| 12 | Preparación para automatización | Despachador de eventos con reintentos, cron de publicación en producción, documentación del pipeline. |

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Desplegar en Vercel con almacenamiento local | Las imágenes subidas se pierden en cada despliegue | Usar un VPS con Docker y disco persistente, o el `S3Driver` (R2/S3) desde el primer despliegue. **Decisión pendiente del propietario.** |
| Las notas programadas dependen de un cron externo | Si el cron no corre, la nota no sale a horario | Endpoint idempotente, alerta si hay notas SCHEDULED vencidas hace más de 5 minutos y contador en el dashboard. |
| XSS a través del contenido del editor | Robo de la sesión del administrador | Se guarda JSON y se renderiza desde una lista cerrada de nodos; los enlaces aceptan sólo `http`, `https` y `mailto`; los embeds se limitan a proveedores permitidos; cabecera CSP. |
| Contenido de ingesta o IA con errores | Daño reputacional | Regla de revisión humana obligatoria, aplicada en el servicio y no sólo en la interfaz. |
| Versiones muy nuevas (Next 16, Prisma 7, Tailwind 4, Vitest 5) | Cambios de API o errores tempranos | Fijar versiones exactas en `package.json`, usar el lockfile y no adoptar versiones RC. |
| Un único administrador | Si pierde la contraseña, no puede entrar | `npm run admin:reset-password` desde el servidor. |

---

## Fase 1 entregada: qué se hizo y cómo se verificó

| Entregable | Estado | Evidencia |
|---|---|---|
| `prisma/schema.prisma` (11 tablas, 3 enums, índices) | **VERIFICADO** | `prisma validate`: "The schema is valid". |
| Migración inicial con búsqueda en español | **VERIFICADO** | `prisma migrate deploy` aplicada en un PostgreSQL 16 limpio; 12 tablas (las 11 del modelo más la de control de Prisma); extensión `unaccent` activa. |
| Sin diferencias entre esquema y base | **VERIFICADO** | `prisma migrate diff` entre la base migrada y el esquema: "This is an empty migration". |
| Búsqueda de texto completo | **VERIFICADO** con SQL sobre datos de prueba (luego revertidos): "economica" sin acento encuentra "económicas"; "medida" encuentra "medidas" (raíz); "inflacion" encuentra texto del cuerpo; tras un `UPDATE` del título el trigger actualiza el índice; el título pesa más que el cuerpo. |
| Tokens de diseño `src/styles/tokens.css` (claro y oscuro) | **VERIFICADO** | Contraste WCAG medido: tinta 16.4:1, secundaria 6.9:1, terciaria 5.1:1, acento 7.1:1, rojo "En vivo" 5.4:1 en tema claro. En tema oscuro, todos por encima de 6:1. La tinta terciaria original (4.3:1) no pasaba AA y la corregí. |
| Propuesta visual `docs/design/preview.html` | **VERIFICADO** | Playwright en 1440, 820 y 390 px, temas claro y oscuro: sin scroll horizontal, sin errores de consola y fuentes cargadas. Revisé las capturas. |
| ADRs `docs/adr/0001` a `0007` | **IMPLEMENTADO** (documentación) | |
| README inicial, `.env.example`, `.gitignore` | **IMPLEMENTADO** | |
| Aplicación Next.js, auth, panel, frontend | **PENDIENTE** | Fases 2 a 12. |
