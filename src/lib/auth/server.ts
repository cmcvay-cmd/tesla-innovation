/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * The app runs its own Better Auth at same-origin `/api/auth/*`, so the session
 * cookie stays on this app's origin. Sign-in is local email/password (the
 * `/login` page). To add social OAuth later, register an app with the provider,
 * then add a `genericOAuth` config here — no other file changes.
 *
 * Database: real Postgres when `DATABASE_URL` is set (Neon/Supabase/RDS…),
 * else the embedded PGLite fallback for local dev — Better Auth persists to
 * the SAME database as app data, using the schema in `migrations/auth/0001_auth.sql`.
 *
 * NEVER import this from client code — it pulls in `pg` + server-only Better
 * Auth internals. The client uses `@/lib/auth/client`; components read the user
 * via `@/lib/auth/use-current-user`; server functions get a verified id via
 * `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/**
 * Preview/dev secret must outlive module reloads: PGLite (and its session rows)
 * is stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev. Process
 * restart clears both the secret and PGLite together. In production set
 * `BETTER_AUTH_SECRET` — then this fallback is never used.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __appAuthDevSecret__?: string;
};
function devAuthSecret(): string {
  globalAuthRef.__appAuthDevSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__appAuthDevSecret__;
}

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

// Explicit off-switch: set `VITE_AUTH_ENABLED=false` to force auth off
// everywhere (app resolves a shared dev user — local development only).
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

/**
 * True when real auth is active. Email/password sign-in is ALWAYS configured
 * (it needs no third-party secrets), so auth is on unless explicitly disabled.
 */
export const authConfigured = !authDisabled;

// This app's own Better Auth origin. In production set `BETTER_AUTH_URL` to the
// public URL (e.g. https://your-app.vercel.app). Unset (local dev), Better Auth
// derives the origin per-request from loopback hosts.
const explicitBaseURL = env("BETTER_AUTH_URL");
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
const baseURL = explicitBaseURL ?? {
  allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
  : [...LOCAL_DEV_ORIGINS];

const databaseUrl = env("DATABASE_URL");

// Real Postgres when `DATABASE_URL` is set (production), else the app's
// embedded PGLite (local dev) via a Kysely dialect — so Better Auth persists to
// the SAME DB as app data, including email/password users.
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/** Session token cookie name. */
export const SESSION_TOKEN_COOKIE = "__Host-app-auth.session_token";

export const auth = betterAuth({
  baseURL,
  // Production: set BETTER_AUTH_SECRET (any long random string). Dev fallback:
  // process-stable secret on globalThis so HMR doesn't invalidate sessions.
  secret: env("BETTER_AUTH_SECRET") ?? devAuthSecret(),
  database,

  // CSRF / origin check for credentialed auth POSTs (sign-up/sign-in, …).
  trustedOrigins,

  // Cache the session in the short-lived signed `session_data` cookie so reads
  // (incl. the client's `/get-session`) skip the DB — reduces auth flicker.
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // Local email/password — toggled only via `./email-password` (not a plugin).
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

  // `__Host-` prefixed cookies: the browser REFUSES any same-named cookie that
  // carries a `Domain` attribute. `__Host-` requires Secure + Path=/ + no
  // Domain; Better Auth otherwise uses `__Secure-` (which permits Domain), so
  // we drop its auto prefix (`useSecureCookies: false`) and set Secure + the
  // names ourselves. (Browsers allow Secure cookies on `http://localhost`.)
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-app-auth.session_data" },
      account_data: { name: "__Host-app-auth.account_data" },
      dont_remember: { name: "__Host-app-auth.dont_remember" },
    },
  },

  plugins: [
    // Accept `Authorization: Bearer <session-token>` as an alternative to the
    // cookie. Only fires when an Authorization header is present, so the cookie
    // path is unaffected.
    bearer(),

    // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
    // last so it runs after every other plugin's hooks.
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}
