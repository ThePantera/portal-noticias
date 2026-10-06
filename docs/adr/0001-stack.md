# ADR 0001: Stack tecnológico

**Estado:** propuesto (6 oct 2026)

## Contexto
Portal de noticias con un único editor al principio, SEO prioritario, y crecimiento futuro hacia ingesta, IA y distribución.

## Decisión
Next.js 16 (App Router), React 19, TypeScript estricto, PostgreSQL 16, Prisma 7.10, Tailwind CSS 4, Tiptap 3, Zod 4, sharp, Vitest y Playwright. Se fijan versiones exactas y no se usan versiones RC.

## Consecuencias
- Una sola aplicación que se despliega como una unidad. Los workers futuros comparten `src/server/services`.
- La búsqueda usa PostgreSQL y no requiere otro servicio. Si el volumen lo exige, se puede migrar a Meilisearch u OpenSearch detrás de `services/search`.
- Requiere un PostgreSQL gestionado en producción (Neon, Supabase, RDS o el del VPS).
