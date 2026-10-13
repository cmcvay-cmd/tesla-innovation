import type { Sql } from "@/lib/db";

const ADMIN_EMAIL = "cmcvayhomes@gmail.com";
const ADMIN_NAME = "Admin";

let pending: Promise<void> | null = null;

/** Create the studio admin (or reset that login) once per process. */
export function ensureStudioAdmin() {
  pending ??= seed().catch((err) => {
    pending = null;
    throw err;
  });
  return pending;
}

async function seed() {
  const password = process.env.STUDIO_ADMIN_PASSWORD?.trim();
  if (!password) return;
  const { hashPassword } = await import("@better-auth/utils/password");
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const hash = await hashPassword(password);
  const existing = await sql<{ id: string }>`
    select id from "user" where lower(email) = ${ADMIN_EMAIL}
  `;
  let userId = existing[0]?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    try {
      await sql`
        insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
        values (${userId}, ${ADMIN_NAME}, ${ADMIN_EMAIL}, true, now(), now())
      `;
    } catch {
      const again = await sql<{ id: string }>`
        select id from "user" where lower(email) = ${ADMIN_EMAIL}
      `;
      userId = again[0]?.id;
      if (!userId) throw new Error("Could not open the admin account");
    }
  } else {
    await sql`
      update "user"
      set "emailVerified" = true, "updatedAt" = now()
      where id = ${userId}
    `;
  }
  const accounts = await sql<{ id: string }>`
    select id from "account" where "userId" = ${userId} and "providerId" = 'credential'
  `;
  if (accounts[0]) {
    await sql`
      update "account"
      set password = ${hash}, "updatedAt" = now()
      where id = ${accounts[0].id}
    `;
  } else {
    await sql`
      insert into "account" (
        "id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt"
      ) values (
        ${crypto.randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, now(), now()
      )
    `;
  }
  await sql`
    insert into profiles (user_id, role)
    values (${userId}, 'admin')
    on conflict (user_id) do update set role = 'admin'
  `;
}

export async function promoteAdminEmail(sql: Sql, userId: string, email: string) {
  if (email.toLowerCase() !== ADMIN_EMAIL) return false;
  await sql`
    insert into profiles (user_id, role)
    values (${userId}, 'admin')
    on conflict (user_id) do update set role = 'admin'
  `;
  return true;
}
