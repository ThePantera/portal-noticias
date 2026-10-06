# ADR 0004: Autenticación y autorización

**Estado:** aceptado e implementado (6 oct 2026)

## Decisión

Sesiones propias en base de datos (token aleatorio de 32 bytes en una cookie httpOnly, Secure y SameSite=Lax; en la base se guarda sólo su SHA-256), contraseñas con argon2id (`@node-rs/argon2`), límite de intentos con la tabla `login_attempts`, y autorización con `can(user, action, resource)` en cada Server Action, Route Handler y página de admin. El `proxy` de Next sólo redirige: no es la barrera de seguridad.

## Alternativas descartadas

- **Auth.js (credenciales):** obliga a usar sesiones JWT, que no se pueden revocar desde el servidor, y la propia documentación desaconseja ese proveedor.
- **Better Auth:** buena opción si se agrega OAuth. Hoy suma superficie sin aportar nada para un único usuario con contraseña.
- **Clerk o Auth0:** dependencia externa y costo por usuario.

## Consecuencias

Unas 150 líneas propias, cubiertas por tests (login correcto e incorrecto, rate limit, sesión vencida, logout, acceso sin sesión y con un rol insuficiente).

## Detalles de la implementación

- Cookie `portal_session`; en producción `__Host-portal_session` (exige Secure, path=/ y sin dominio, así ningún subdominio puede pisarla). `httpOnly`, `SameSite=Lax`, vencimiento igual al de la sesión en base.
- Si el email no existe se verifica igual contra un hash descartable, para que la respuesta tarde lo mismo y no se pueda deducir qué cuentas existen por el tiempo.
- El bloqueo por email cuenta los fallos desde el último acceso correcto dentro de la ventana, así un login exitoso limpia el contador.
- Sin permiso se responde 404 (`notFound()`) en vez de 403, para no revelar qué rutas existen.
- Las Server Actions de Next verifican el origen de la petición, lo que cubre CSRF en el login y el logout.
- Cambiar la contraseña cierra todas las sesiones de ese usuario.
