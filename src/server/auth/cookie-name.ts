// Sin "server-only": lo importa también src/proxy.ts.
/** En producción se usa el prefijo __Host-: exige Secure, path=/ y sin dominio, así ningún subdominio la pisa. */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-portal_session" : "portal_session";
