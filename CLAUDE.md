@AGENTS.md

# Reglas del proyecto

- Idioma: código y nombres en inglés; textos de interfaz, comentarios y documentación en español.
- Antes de dar por terminada una funcionalidad: `npm run check` (lint, typecheck, formato, tests) y `npm run build` en verde, y revisar las páginas afectadas en 390, 820 y 1440 px.
- Al informar, distinguir IMPLEMENTADO / VERIFICADO / PENDIENTE. No afirmar nada que no se haya ejecutado.
- Capas (docs/adr/0002-capas.md): `app/` llama a `src/server/services`; `src/lib` y `src/components` no importan `src/server` (ESLint lo bloquea).
- Colores, tipografía y espaciado salen de `src/styles/tokens.css`; no usar colores sueltos.
- Prisma 7: el cliente se genera en `src/generated/prisma`; la búsqueda usa un trigger de PostgreSQL (no columna GENERATED, ver ADR 0003).
