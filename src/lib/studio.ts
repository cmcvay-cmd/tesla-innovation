import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Sql } from "@/lib/db";
import { monthlyPayment, projectCents, usd } from "@/lib/money";
import { FINANCE_APR_BPS, FINANCE_TERMS, tierById } from "@/lib/offers";

const ADMIN_EMAIL = "cmcvayhomes@gmail.com";

export type QuoteMode = "live" | "target" | "signal";

export type Profile = {
  userId: string;
  role: "admin" | "member";
  name: string;
  email: string;
  avatar: string;
};

export type Vehicle = {
  id: string;
  name: string;
  tagline: string;
  kind: string;
  image: string;
  anchorCents: number;
  rangeMi: number | null;
  zeroToSixty: string;
  drive: string;
  status: string;
  quoteMode: QuoteMode;
  blurb: string;
  sortOrder: number;
};

export type Plan = {
  id: string;
  name: string;
  horizonMonths: number;
  minCents: number;
  aprBps: number;
  risk: string;
  summary: string;
  active: boolean;
  sortOrder: number;
};

export type Reservation = {
  id: number;
  userId: string;
  name: string;
  email: string;
  modelId: string;
  modelName: string;
  color: string;
  buyerName: string;
  phone: string;
  contactEmail: string;
  city: string;
  payMethod: string;
  termMonths: number | null;
  status: string;
  createdAt: string;
};

export type Investment = {
  id: number;
  userId: string;
  name: string;
  email: string;
  planId: string;
  planName: string;
  amountCents: number;
  aprBps: number;
  horizonMonths: number;
  status: string;
  openedAt: string;
};

export type ChatMessage = {
  id: number;
  userId: string;
  senderId: string;
  body: string;
  image: string | null;
  createdAt: string;
  seenAt: string | null;
  senderAvatar: string;
};

export type Stake = {
  id: number;
  userId: string;
  name: string;
  email: string;
  modelId: string;
  modelName: string;
  amountCents: number;
  aprBps: number;
  horizonMonths: number;
  status: string;
  createdAt: string;
};

export type Person = {
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  createdAt: string;
};

export type AdminBoard = {
  vehicles: Vehicle[];
  plans: Plan[];
  reservations: Reservation[];
  investments: Investment[];
  stakes: Stake[];
  people: Person[];
  messages: ChatMessage[];
};

export const PAINTS = ["Pearl White", "Stealth Grey", "Ultra Red", "Quicksilver", "Midnight"] as const;
const MODEL_STATUS = new Set(["available", "limited", "coming", "closed"]);
const INV_STATUS = new Set(["pending", "active", "closed", "declined"]);
const RES_STATUS = new Set(["requested", "confirmed", "cancelled"]);

function num(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function flag(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function asMode(value: string): QuoteMode {
  if (value === "target" || value === "signal") return value;
  return "live";
}

type VehicleRow = {
  id: string;
  name: string;
  tagline: string;
  kind: string;
  image: string;
  anchorCents: number;
  rangeMi: number | null;
  zeroToSixty: string;
  drive: string;
  status: string;
  quoteMode: string;
  blurb: string;
  sortOrder: number;
};

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    kind: row.kind,
    image: row.image,
    anchorCents: num(row.anchorCents),
    rangeMi: row.rangeMi == null ? null : num(row.rangeMi),
    zeroToSixty: row.zeroToSixty ?? "",
    drive: row.drive,
    status: row.status,
    quoteMode: asMode(row.quoteMode),
    blurb: row.blurb,
    sortOrder: num(row.sortOrder),
  };
}

const vehicleSelect = `
  id, name, tagline, kind, image,
  anchor_cents as "anchorCents",
  range_mi as "rangeMi",
  zero_to_sixty as "zeroToSixty",
  drive, status,
  quote_mode as "quoteMode",
  blurb,
  sort_order as "sortOrder"
`;

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function roleOf(sql: Sql, userId: string) {
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  return rows[0]?.role === "admin" ? "admin" : "member";
}

async function assertAdmin(sql: Sql, userId: string) {
  if ((await roleOf(sql, userId)) !== "admin") throw new Error("Forbidden");
}

export const listVehicles = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const rows = await sql.query<VehicleRow>(
    `select ${vehicleSelect} from models where status <> 'closed' order by sort_order`,
  );
  return rows.map(mapVehicle);
});

export const getVehicle = createServerFn({ method: "GET" })
  .validator((id: string) => {
    if (typeof id !== "string" || !/^[a-z0-9-]{2,40}$/.test(id)) throw new Error("Unknown vehicle");
    return id;
  })
  .handler(async ({ data: id }) => {
    const sql = await db();
    const rows = await sql.query<VehicleRow>(
      `select ${vehicleSelect} from models where id = $1`,
      [id],
    );
    return rows[0] ? mapVehicle(rows[0]) : null;
  });

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const rows = await sql<{
    id: string;
    name: string;
    horizonMonths: number;
    minCents: number;
    aprBps: number;
    risk: string;
    summary: string;
    active: boolean;
    sortOrder: number;
  }>`
    select id, name, horizon_months as "horizonMonths", min_cents as "minCents",
           apr_bps as "aprBps", risk, summary, active, sort_order as "sortOrder"
    from plans
    where active = true
    order by sort_order
  `;
  return rows.map((row) => ({
    ...row,
    horizonMonths: num(row.horizonMonths),
    minCents: num(row.minCents),
    aprBps: num(row.aprBps),
    active: flag(row.active),
    sortOrder: num(row.sortOrder),
  })) satisfies Plan[];
});

export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile> => {
    const sql = await db();
    const existing = await sql<{ role: string }>`
      select role from profiles where user_id = ${context.userId}
    `;
    const emailRows = await sql<{ email: string }>`
      select email from "user" where id = ${context.userId}
    `;
    const email = emailRows[0]?.email ?? "";
    const isDesk = email.toLowerCase() === ADMIN_EMAIL;
    if (existing.length === 0) {
      await sql`
        insert into profiles (user_id, role)
        values (${context.userId}, ${isDesk ? "admin" : "member"})
        on conflict (user_id) do nothing
      `;
    } else if (isDesk && existing[0]?.role !== "admin") {
      await sql`update profiles set role = 'admin' where user_id = ${context.userId}`;
    }
    const rows = await sql<{ name: string; email: string; role: string | null; avatar: string | null }>`
      select u.name, u.email, p.role, coalesce(p.avatar, '') as avatar
      from "user" u
      left join profiles p on p.user_id = u.id
      where u.id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) throw new Error("Account not found");
    return {
      userId: context.userId,
      role: row.role === "admin" || row.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "member",
      name: row.name,
      email: row.email,
      avatar: row.avatar ?? "",
    };
  });

export const inboxFlag = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const role = await roleOf(sql, context.userId);
    if (role === "admin") {
      const rows = await sql<{ unread: boolean }>`
        select exists (
          select 1
          from (
            select distinct on (user_id) user_id, sender_id
            from messages
            order by user_id, id desc
          ) last
          where last.sender_id = last.user_id
        ) as unread
      `;
      return { unread: flag(rows[0]?.unread) };
    }
    const rows = await sql<{ senderId: string }>`
      select sender_id as "senderId"
      from messages
      where user_id = ${context.userId}
      order by id desc
      limit 1
    `;
    const sender = rows[0]?.senderId;
    return { unread: Boolean(sender) && sender !== context.userId };
  });

export const myBook = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const reservations = await reservationQuery(sql, context.userId);
    const investments = await investmentQuery(sql, context.userId);
    const stakes = await stakeQuery(sql, context.userId);
    return { reservations, investments, stakes };
  });

export const myMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    const rows = await messageQuery(sql, context.userId);
    return rows;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { body: string; image?: string | null }) => {
    const body = cleanBody(input.body);
    const image = cleanImage(input.image);
    return { body, image };
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    if ((await roleOf(sql, context.userId)) === "admin") {
      throw new Error("Reply from the studio desk");
    }
    await sql`
      insert into messages (user_id, sender_id, body, image)
      values (${context.userId}, ${context.userId}, ${data.body}, ${data.image})
    `;
    return { ok: true };
  });

export const requestVehicle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { modelId: string; color: string }) => {
    if (!input || typeof input.modelId !== "string" || typeof input.color !== "string") {
      throw new Error("Choose a color");
    }
    if (!/^[a-z0-9-]{2,40}$/.test(input.modelId)) throw new Error("Unknown vehicle");
    if (!PAINTS.includes(input.color as (typeof PAINTS)[number])) throw new Error("Choose a color");
    return { modelId: input.modelId, color: input.color };
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    const models = await sql<{ status: string }>`
      select status from models where id = ${data.modelId}
    `;
    if (!models[0] || models[0].status === "closed") throw new Error("That vehicle is closed");
    const open = await sql<{ id: number }>`
      select id from reservations
      where user_id = ${context.userId}
        and model_id = ${data.modelId}
        and status <> 'cancelled'
    `;
    if (open.length > 0) throw new Error("You already have a request on this vehicle");
    await sql`
      insert into reservations (user_id, model_id, color)
      values (${context.userId}, ${data.modelId}, ${data.color})
    `;
    return { ok: true };
  });

export const setAvatar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: string) => {
    if (typeof input !== "string" || !input.startsWith("data:image/jpeg;base64,")) {
      throw new Error("Use a photo");
    }
    if (input.length > 180_000) throw new Error("That photo is too large");
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    await sql`
      insert into profiles (user_id, role)
      values (${context.userId}, 'member')
      on conflict (user_id) do nothing
    `;
    await sql`update profiles set avatar = ${data} where user_id = ${context.userId}`;
    await sql`
      update "user" set image = ${data}, "updatedAt" = now() where id = ${context.userId}
    `;
    return { avatar: data };
  });

export const studioFace = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await db();
    const rows = await sql<{ name: string; avatar: string }>`
      select u.name, coalesce(p.avatar, '') as avatar
      from profiles p
      join "user" u on u.id = p.user_id
      where p.role = 'admin'
      order by p.created_at asc
      limit 1
    `;
    return rows[0] ?? { name: "Elon Musk", avatar: "" };
  });

type ShopInput = {
  modelId: string;
  color: string;
  buyerName: string;
  phone: string;
  email: string;
  city: string;
  payMethod: "cash" | "finance";
  termMonths: number | null;
};

export const shopVehicle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ShopInput) => parseShop(input))
  .handler(async ({ context, data }) => {
    const sql = await db();
    const models = await sql<{ name: string; anchorCents: number; status: string }>`
      select name, anchor_cents as "anchorCents", status from models where id = ${data.modelId}
    `;
    const model = models[0];
    if (!model || model.status === "closed") throw new Error("That vehicle is closed");
    const open = await sql<{ id: number }>`
      select id from reservations
      where user_id = ${context.userId}
        and model_id = ${data.modelId}
        and status <> 'cancelled'
    `;
    if (open[0]) {
      await sql`
        update reservations
        set color = ${data.color},
            buyer_name = ${data.buyerName},
            phone = ${data.phone},
            contact_email = ${data.email},
            city = ${data.city},
            pay_method = ${data.payMethod},
            term_months = ${data.termMonths}
        where id = ${open[0].id}
      `;
    } else {
      await sql`
        insert into reservations (
          user_id, model_id, color, buyer_name, phone, contact_email, city, pay_method, term_months
        ) values (
          ${context.userId}, ${data.modelId}, ${data.color}, ${data.buyerName},
          ${data.phone}, ${data.email}, ${data.city}, ${data.payMethod}, ${data.termMonths}
        )
      `;
    }
    const anchor = num(model.anchorCents);
    const pay =
      data.payMethod === "finance" && data.termMonths
        ? `Finance · ${data.termMonths} months · ${usd(monthlyPayment(anchor, FINANCE_APR_BPS, data.termMonths))}/mo`
        : `Cash · ${usd(anchor)}`;
    await sql`
      insert into messages (user_id, sender_id, body)
      values (
        ${context.userId},
        ${context.userId},
        ${[
          `Shop — ${model.name}`,
          `Name: ${data.buyerName}`,
          `Phone: ${data.phone}`,
          `Email: ${data.email}`,
          `City: ${data.city}`,
          `Color: ${data.color}`,
          `Payment: ${pay}`,
        ].join("\n")}
      )
    `;
    return { ok: true };
  });

export const investModel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { modelId: string; tierId: string }) => {
    if (!input || typeof input.modelId !== "string" || typeof input.tierId !== "string") {
      throw new Error("Choose an amount");
    }
    if (!/^[a-z0-9-]{2,40}$/.test(input.modelId)) throw new Error("Unknown vehicle");
    const tier = tierById(input.tierId);
    if (!tier) throw new Error("Choose an amount");
    return { modelId: input.modelId, tierId: tier.id };
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    const tier = tierById(data.tierId);
    if (!tier) throw new Error("Choose an amount");
    const models = await sql<{ name: string; status: string }>`
      select name, status from models where id = ${data.modelId}
    `;
    const model = models[0];
    if (!model || model.status === "closed") throw new Error("That vehicle is closed");
    const planRows = await sql<{ aprBps: number }>`
      select apr_bps as "aprBps" from plans where active = true order by apr_bps desc limit 1
    `;
    const liveApr = planRows[0] ? num(planRows[0].aprBps) : tier.aprBps;
    await sql`
      insert into model_stakes (user_id, model_id, amount_cents, apr_bps, horizon_months)
      values (${context.userId}, ${data.modelId}, ${tier.amountCents}, ${liveApr}, ${tier.horizonMonths})
    `;
    const back = projectCents(tier.amountCents, liveApr, tier.horizonMonths);
    await sql`
      insert into messages (user_id, sender_id, body)
      values (
        ${context.userId},
        ${context.userId},
        ${[
          `Invest now — ${model.name}`,
          `Sleeve: ${tier.name}`,
          `Amount: ${usd(tier.amountCents)}`,
          `Horizon: ${tier.horizonMonths} months`,
          `Pace: ${(liveApr / 100).toFixed(1)}%`,
          `Return: ${usd(back - tier.amountCents)}`,
          `At maturity: ${usd(back)}`,
        ].join("\n")}
      )
    `;
    return { ok: true };
  });

export const commitPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { planId: string; amountCents: number }) => {
    if (!input || typeof input.planId !== "string" || typeof input.amountCents !== "number") {
      throw new Error("Enter an amount");
    }
    if (!/^[a-z0-9-]{2,40}$/.test(input.planId)) throw new Error("Unknown plan");
    if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
      throw new Error("Enter a whole dollar amount");
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    const plans = await sql<{ minCents: number; active: boolean }>`
      select min_cents as "minCents", active from plans where id = ${data.planId}
    `;
    const plan = plans[0];
    if (!plan || !flag(plan.active)) throw new Error("That plan is closed");
    const min = num(plan.minCents);
    if (data.amountCents < min) throw new Error("Amount is below the plan minimum");
    if (data.amountCents > 500_000_000) throw new Error("Amount is above the desk limit");
    await sql`
      insert into investments (user_id, plan_id, amount_cents)
      values (${context.userId}, ${data.planId}, ${data.amountCents})
    `;
    return { ok: true };
  });

export const adminBoard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AdminBoard> => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    const vehicles = (
      await sql.query<VehicleRow>(`select ${vehicleSelect} from models order by sort_order`)
    ).map(mapVehicle);
    const planRows = await sql<{
      id: string;
      name: string;
      horizonMonths: number;
      minCents: number;
      aprBps: number;
      risk: string;
      summary: string;
      active: boolean;
      sortOrder: number;
    }>`
      select id, name, horizon_months as "horizonMonths", min_cents as "minCents",
             apr_bps as "aprBps", risk, summary, active, sort_order as "sortOrder"
      from plans order by sort_order
    `;
    const plans: Plan[] = planRows.map((row) => ({
      ...row,
      horizonMonths: num(row.horizonMonths),
      minCents: num(row.minCents),
      aprBps: num(row.aprBps),
      active: flag(row.active),
      sortOrder: num(row.sortOrder),
    }));
    const reservations = await reservationQuery(sql, null);
    const investments = await investmentQuery(sql, null);
    const stakes = await stakeQuery(sql, null);
    const people = await sql<{
      userId: string;
      name: string;
      email: string;
      role: string | null;
      avatar: string | null;
      createdAt: string;
    }>`
      select u.id as "userId", u.name, u.email, p.role, coalesce(p.avatar, '') as avatar,
             to_char(u."createdAt" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
      from "user" u
      left join profiles p on p.user_id = u.id
      order by u."createdAt" asc
    `;
    const messages = await sql.query<ChatMessage>(
      `select m.id, m.user_id as "userId", m.sender_id as "senderId", m.body,
              m.image,
              to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
              coalesce(p.avatar, '') as "senderAvatar"
       from messages m
       left join profiles p on p.user_id = m.sender_id
       order by m.id desc limit 400`,
    );
    return {
      vehicles,
      plans,
      reservations,
      investments,
      stakes,
      people: people.map((person) => ({
        userId: person.userId,
        name: person.name,
        email: person.email,
        role: person.role === "admin" ? "admin" : "member",
        avatar: person.avatar ?? "",
        createdAt: person.createdAt,
      })),
      messages: messages.reverse().map((message) => ({
        ...message,
        id: num(message.id),
        image: message.image || null,
        senderAvatar: message.senderAvatar ?? "",
      })),
    };
  });

export type AdminAct =
  | {
      type: "model";
      id: string;
      name: string;
      tagline: string;
      kind: string;
      image: string;
      anchorCents: number;
      rangeMi: number | null;
      zeroToSixty: string;
      drive: string;
      status: string;
      quoteMode: QuoteMode;
      blurb: string;
      sortOrder: number;
    }
  | {
      type: "plan";
      id: string;
      name: string;
      horizonMonths: number;
      minCents: number;
      aprBps: number;
      risk: string;
      summary: string;
      active: boolean;
      sortOrder: number;
    }
  | { type: "investment"; id: number; status: string }
  | { type: "stake"; id: number; status: string }
  | { type: "reservation"; id: number; status: string }
  | { type: "role"; userId: string; role: "admin" | "member" }
  | { type: "reply"; userId: string; body: string; image?: string | null };

export const adminAct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: AdminAct) => parseAct(input))
  .handler(async ({ context, data }) => {
    const sql = await db();
    await assertAdmin(sql, context.userId);
    if (data.type === "model") {
      await sql`
        update models
        set name = ${data.name},
            tagline = ${data.tagline},
            kind = ${data.kind},
            image = ${data.image},
            anchor_cents = ${data.anchorCents},
            range_mi = ${data.rangeMi},
            zero_to_sixty = ${data.zeroToSixty},
            drive = ${data.drive},
            status = ${data.status},
            quote_mode = ${data.quoteMode},
            blurb = ${data.blurb},
            sort_order = ${data.sortOrder}
        where id = ${data.id}
      `;
    } else if (data.type === "plan") {
      await sql`
        update plans
        set name = ${data.name},
            horizon_months = ${data.horizonMonths},
            min_cents = ${data.minCents},
            apr_bps = ${data.aprBps},
            risk = ${data.risk},
            summary = ${data.summary},
            active = ${data.active},
            sort_order = ${data.sortOrder}
        where id = ${data.id}
      `;
    } else if (data.type === "investment") {
      await sql`
        update investments
        set status = ${data.status},
            opened_at = case
              when ${data.status} = 'active' and status = 'pending' then now()
              else opened_at
            end
        where id = ${data.id}
      `;
    } else if (data.type === "stake") {
      await sql`update model_stakes set status = ${data.status} where id = ${data.id}`;
    } else if (data.type === "reservation") {
      await sql`update reservations set status = ${data.status} where id = ${data.id}`;
    } else if (data.type === "role") {
      if (data.role === "member") {
        const admins = await sql<{ n: number }>`
          select count(*)::int as n from profiles where role = 'admin'
        `;
        const target = await sql<{ role: string }>`
          select role from profiles where user_id = ${data.userId}
        `;
        if (num(admins[0]?.n) <= 1 && target[0]?.role === "admin") {
          throw new Error("The studio needs one admin");
        }
      }
      await sql`
        insert into profiles (user_id, role)
        values (${data.userId}, ${data.role})
        on conflict (user_id) do update set role = excluded.role
      `;
    } else {
      const users = await sql<{ id: string }>`select id from "user" where id = ${data.userId}`;
      if (!users[0]) throw new Error("Unknown member");
      await sql`
        insert into messages (user_id, sender_id, body, image)
        values (${data.userId}, ${context.userId}, ${data.body}, ${data.image ?? null})
      `;
    }
    return { ok: true };
  });

function cleanBody(body: unknown) {
  if (typeof body !== "string") throw new Error("Write a message");
  const text = body.trim();
  if (text.length < 1 || text.length > 2000) throw new Error("Message must be 1 to 2000 characters");
  return text;
}

function cleanImage(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid image");
  const text = value.trim();
  if (text.length === 0) return null;
  if (text.length > 180_000) throw new Error("Image is too large");
  if (
    text.startsWith("https://") ||
    text.startsWith("http://") ||
    text.startsWith("data:image/")
  ) {
    return text;
  }
  throw new Error("Image must be a URL or data URL");
}

function clip(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "string") throw new Error(label);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new Error(label);
  return text;
}

function parseShop(input: ShopInput): ShopInput {
  if (!input || typeof input.modelId !== "string" || typeof input.color !== "string") {
    throw new Error("Complete the form");
  }
  if (!/^[a-z0-9-]{2,40}$/.test(input.modelId)) throw new Error("Unknown vehicle");
  if (!PAINTS.includes(input.color as (typeof PAINTS)[number])) throw new Error("Choose a color");
  const buyerName = clip(input.buyerName, "Enter your name", 2, 80);
  const city = clip(input.city, "Enter your city", 2, 80);
  const phoneRaw = clip(input.phone, "Enter a phone number", 7, 30);
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) throw new Error("Enter a phone number");
  const email = clip(input.email, "Enter an email", 5, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter an email");
  if (input.payMethod !== "cash" && input.payMethod !== "finance") throw new Error("Choose cash or finance");
  let termMonths: number | null = null;
  if (input.payMethod === "finance") {
    if (!FINANCE_TERMS.includes(input.termMonths as (typeof FINANCE_TERMS)[number])) {
      throw new Error("Choose a term");
    }
    termMonths = input.termMonths;
  }
  return {
    modelId: input.modelId,
    color: input.color,
    buyerName,
    phone: phoneRaw,
    email,
    city,
    payMethod: input.payMethod,
    termMonths,
  };
}

function parseAct(input: AdminAct): AdminAct {
  if (!input || typeof input !== "object" || typeof input.type !== "string") {
    throw new Error("Invalid action");
  }
  if (input.type === "model") {
    if (!/^[a-z0-9-]{2,40}$/.test(input.id)) throw new Error("Unknown vehicle");
    if (!Number.isInteger(input.anchorCents) || input.anchorCents < 100_000 || input.anchorCents > 100_000_000) {
      throw new Error("Anchor must be between $1,000 and $1,000,000");
    }
    if (!MODEL_STATUS.has(input.status)) throw new Error("Unknown status");
    if (!["live", "target", "signal"].includes(input.quoteMode)) throw new Error("Unknown quote mode");
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 100) {
      throw new Error("Sort order out of range");
    }
    return {
      ...input,
      name: clip(input.name, "Name required", 1, 80),
      tagline: clip(input.tagline, "Tagline required", 1, 120),
      kind: clip(input.kind, "Kind required", 1, 40),
      image: clip(input.image, "Image path required", 1, 200),
      zeroToSixty: typeof input.zeroToSixty === "string" ? input.zeroToSixty.trim().slice(0, 20) : "",
      drive: clip(input.drive, "Drive required", 1, 60),
      blurb: clip(input.blurb, "Blurb required", 1, 1000),
      rangeMi: input.rangeMi == null || (Number.isInteger(input.rangeMi) && input.rangeMi >= 0 && input.rangeMi <= 1000)
        ? input.rangeMi
        : null,
    };
  }
  if (input.type === "plan") {
    if (!/^[a-z0-9-]{2,40}$/.test(input.id)) throw new Error("Unknown plan");
    if (!Number.isInteger(input.minCents) || input.minCents < 10_000 || input.minCents > 100_000_000) {
      throw new Error("Minimum is out of range");
    }
    if (!Number.isInteger(input.aprBps) || input.aprBps < 0 || input.aprBps > 50000) {
      throw new Error("Pace must be between 0 and 500 percent");
    }
    if (!Number.isInteger(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 120) {
      throw new Error("Horizon out of range");
    }
    if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 100) {
      throw new Error("Sort order out of range");
    }
    if (typeof input.active !== "boolean") throw new Error("Invalid plan");
    return {
      ...input,
      name: clip(input.name, "Name required", 1, 80),
      risk: clip(input.risk, "Risk required", 1, 40),
      summary: clip(input.summary, "Summary required", 1, 500),
    };
  }
  if (input.type === "investment" || input.type === "stake") {
    if (!Number.isInteger(input.id)) throw new Error("Unknown allocation");
    if (!INV_STATUS.has(input.status)) throw new Error("Unknown status");
    return input;
  }
  if (input.type === "reservation") {
    if (!Number.isInteger(input.id)) throw new Error("Unknown request");
    if (!RES_STATUS.has(input.status)) throw new Error("Unknown status");
    return input;
  }
  if (input.type === "role") {
    if (typeof input.userId !== "string" || input.userId.length < 1 || input.userId.length > 80) {
      throw new Error("Unknown member");
    }
    if (input.role !== "admin" && input.role !== "member") throw new Error("Unknown role");
    return input;
  }
  if (input.type === "reply") {
    if (typeof input.userId !== "string" || input.userId.length < 1 || input.userId.length > 80) {
      throw new Error("Unknown member");
    }
    return {
      type: "reply",
      userId: input.userId,
      body: cleanBody(input.body),
      image: cleanImage(input.image),
    };
  }
  throw new Error("Invalid action");
}

async function reservationQuery(sql: Sql, userId: string | null) {
  const select = `
    select r.id, r.user_id as "userId", u.name, u.email, r.model_id as "modelId",
           m.name as "modelName", r.color, r.buyer_name as "buyerName", r.phone,
           r.contact_email as "contactEmail", r.city, r.pay_method as "payMethod",
           r.term_months as "termMonths", r.status,
           to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
    from reservations r
    join "user" u on u.id = r.user_id
    join models m on m.id = r.model_id
  `;
  const rows = userId
    ? await sql.query<Reservation>(`${select} where r.user_id = $1 order by r.id desc`, [userId])
    : await sql.query<Reservation>(`${select} order by r.id desc limit 100`);
  return rows.map((row) => ({
    ...row,
    id: num(row.id),
    buyerName: row.buyerName ?? "",
    phone: row.phone ?? "",
    contactEmail: row.contactEmail ?? "",
    city: row.city ?? "",
    payMethod: row.payMethod || "cash",
    termMonths: row.termMonths == null ? null : num(row.termMonths),
  }));
}

async function stakeQuery(sql: Sql, userId: string | null) {
  const select = `
    select s.id, s.user_id as "userId", u.name, u.email, s.model_id as "modelId",
           m.name as "modelName", s.amount_cents as "amountCents", s.apr_bps as "aprBps",
           s.horizon_months as "horizonMonths", s.status,
           to_char(s.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
    from model_stakes s
    join "user" u on u.id = s.user_id
    join models m on m.id = s.model_id
  `;
  const rows = userId
    ? await sql.query<Stake>(`${select} where s.user_id = $1 order by s.id desc`, [userId])
    : await sql.query<Stake>(`${select} order by s.id desc limit 100`);
  return rows.map((row) => ({
    ...row,
    id: num(row.id),
    amountCents: num(row.amountCents),
    aprBps: num(row.aprBps),
    horizonMonths: num(row.horizonMonths),
  }));
}

async function investmentQuery(sql: Sql, userId: string | null) {
  const rows = userId
    ? await sql<Investment>`
        select i.id, i.user_id as "userId", u.name, u.email, i.plan_id as "planId",
               p.name as "planName", i.amount_cents as "amountCents", p.apr_bps as "aprBps",
               p.horizon_months as "horizonMonths", i.status,
               to_char(i.opened_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "openedAt"
        from investments i
        join "user" u on u.id = i.user_id
        join plans p on p.id = i.plan_id
        where i.user_id = ${userId}
        order by i.id desc
      `
    : await sql<Investment>`
        select i.id, i.user_id as "userId", u.name, u.email, i.plan_id as "planId",
               p.name as "planName", i.amount_cents as "amountCents", p.apr_bps as "aprBps",
               p.horizon_months as "horizonMonths", i.status,
               to_char(i.opened_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "openedAt"
        from investments i
        join "user" u on u.id = i.user_id
        join plans p on p.id = i.plan_id
        order by i.id desc
        limit 100
      `;
  return rows.map((row) => ({
    ...row,
    id: num(row.id),
    amountCents: num(row.amountCents),
    aprBps: num(row.aprBps),
    horizonMonths: num(row.horizonMonths),
  }));
}

async function messageQuery(sql: Sql, userId: string) {
  const rows = await sql<ChatMessage>`
    select m.id, m.user_id as "userId", m.sender_id as "senderId", m.body,
           m.image,
           to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
           to_char(m.seen_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "seenAt",
           coalesce(p.avatar, '') as "senderAvatar"
    from messages m
    left join profiles p on p.user_id = m.sender_id
    where m.user_id = ${userId}
    order by m.id desc
    limit 200
  `;
  return rows
    .map((row) => ({
      ...row,
      id: num(row.id),
      image: row.image || null,
      seenAt: row.seenAt || null,
      senderAvatar: row.senderAvatar ?? "",
    }))
    .reverse();
}

export const markSeen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadUserId: string }) => {
    if (!input || typeof input.threadUserId !== "string") throw new Error("Missing thread");
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    await sql`
      update messages set seen_at = now()
      where user_id = ${data.threadUserId}
        and sender_id <> ${context.userId}
        and seen_at is null
    `;
    return { ok: true };
  });

export const setTyping = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { threadUserId: string; typing: boolean }) => {
    if (!input || typeof input.threadUserId !== "string") throw new Error("Missing thread");
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await db();
    if (data.typing) {
      await sql`
        insert into typing (user_id, thread_user_id, updated_at)
        values (${context.userId}, ${data.threadUserId}, now())
        on conflict (user_id) do update set thread_user_id = ${data.threadUserId}, updated_at = now()
      `;
    } else {
      await sql`delete from typing where user_id = ${context.userId}`;
    }
    return { ok: true };
  });

export const getTyping = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((threadUserId: string) => {
    if (typeof threadUserId !== "string") throw new Error("Missing thread");
    return threadUserId;
  })
  .handler(async ({ context, data: threadUserId }) => {
    const sql = await db();
    const rows = await sql<{ userId: string }>`
      select user_id as "userId" from typing
      where thread_user_id = ${threadUserId}
        and user_id <> ${context.userId}
        and updated_at > now() - interval '4 seconds'
    `;
    return { typing: rows.length > 0 };
  });
