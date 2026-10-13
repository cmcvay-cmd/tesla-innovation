import { getRequest } from "@tanstack/react-start/server";
import { auth, authConfigured } from "./server";

/**
 * Server-side session resolution (server-only).
 *
 * This app runs its OWN Better Auth at same-origin `/api/auth/*`, so the session
 * cookie is sent with every request to this app — server functions AND SSR
 * loaders included. So we resolve the user straight from the request cookies
 * via `auth.api.getSession`. Never trust a client-supplied user id — only the
 * result of this verification.
 */

/** True when a real database is configured server-side. */
const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

/** Re-export so callers can branch on it without importing `server.ts`. */
export { authConfigured };

if (databaseConfigured && !authConfigured) {
  console.error(
    "[auth] DATABASE_URL is set but auth is disabled (VITE_AUTH_ENABLED=false) " +
      "— requireUserId() will reject every request (fail closed) rather than " +
      "share one dev user on a real database.",
  );
}

/** Dev fallback user id, used only when auth is disabled (VITE_AUTH_ENABLED=false). */
export const DEV_USER_ID = "dev-user";

/**
 * Thrown by `requireUserId` when the caller has no valid session. Carries
 * `status: 401`; the message is a stable contract — match
 * `err.message === "Unauthorized"` client-side to send the visitor to sign-in.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/**
 * Resolve the signed-in user from the current request, or `null` when auth
 * isn't configured / nobody is signed in. Safe to call from server functions
 * and SSR loaders.
 */
export async function getSessionUser(): Promise<VerifiedUser | null> {
  if (!authConfigured) return null;
  const request = getRequest();
  if (!request) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? null };
}

/**
 * Require a signed-in user, or throw `UnauthorizedError` (401).
 */
export async function requireUserId(): Promise<string> {
  if (!authConfigured) {
    if (databaseConfigured) {
      // Fail closed on a real database — never share one dev identity.
      throw new UnauthorizedError();
    }
    return DEV_USER_ID;
  }
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
