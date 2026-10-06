# ADR 0004: Autenticación y autorización

**Estado:** propuesto (6 oct 2026)

## Decisión

Sesiones propias en base de datos (token aleatorio de 32 bytes en una cookie httpOnly, Secure y SameSite=Lax; en la base se guarda sólo su SHA-256), contraseñas con argon2id (`@node-rs/argon2`), límite de intentos con la tabla `login_attempts`, y autorización con `can(user, action, resource)` en cada Server Action, Route Handler y página de admin. El `proxy` de Next sólo redirige: no es la barrera de seguridad.

## Alternativas descartadas

- **Auth.js (credenciales):** obliga a usar sesiones JWT, que no se pueden revocar desde el servidor, y la propia documentación desaconseja ese proveedor.
- **Better Auth:** buena opción si se agrega OAuth. Hoy suma superficie sin aportar nada para un único usuario con contraseña.
- **Clerk o Auth0:** dependencia externa y costo por usuario.

## Consecuencias

Unas 150 líneas propias, cubiertas por tests (login correcto e incorrecto, rate limit, sesión vencida, logout, acceso sin sesión y con un rol insuficiente).
