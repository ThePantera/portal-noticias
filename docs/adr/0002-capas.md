# ADR 0002: Capas y reglas de dependencia

**Estado:** propuesto (6 oct 2026)

## Decisión

- `app/` (presentación, admin y API) sólo llama a `server/services`.
- `server/services` concentra la lógica de negocio: validación con Zod, permisos con `can()`, transiciones de estado, slug y eventos.
- `lib/` es código puro, sin acceso a la base, y se puede usar en cliente y servidor.
- `server/**` importa `server-only`.
- No hay capa de "repositorios": los servicios usan Prisma directamente. Otra abstracción encima de Prisma no aporta nada en este tamaño.

## Consecuencias

La misma regla ("sólo un humano con permiso publica") vale para el panel, la API y cualquier worker, porque todos pasan por el mismo servicio. Una regla de ESLint (`no-restricted-imports`) impide importar `server/` desde componentes cliente.
