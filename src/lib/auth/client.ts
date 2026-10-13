import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for the React app (browser-side).
 *
 * Talks to this app's OWN Better Auth at same-origin `/api/auth/*`, with plain
 * cookie auth — no bearer-token plumbing (that existed only for the Grok
 * live-preview iframe and is gone).
 */
export const authClient = createAuthClient();

/**
 * True when sign-in UI should be shown — i.e. whenever `VITE_AUTH_ENABLED` is
 * not `"false"`. Set it to `"false"` only for throwaway local demos (the app
 * then runs as a shared dev user with no real sessions).
 */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";
