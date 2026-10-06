import "server-only";

const isProduction = process.env.NODE_ENV === "production";

export const SESSION_TTL_MS = Number(process.env.SESSION_TTL_DAYS ?? 30) * 24 * 60 * 60 * 1000;

export { SESSION_COOKIE } from "./cookie-name";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export const LOGIN_LIMITS = {
  windowMs: 15 * 60 * 1000,
  maxFailuresPerEmail: 5,
  maxFailuresPerIp: 20,
};
