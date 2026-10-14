import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Guard, Note, primaryBtn, ghostBtn, accentBtn, Skeleton, StatusPill, Avatar } from "@/components/bits";
import { useStudio } from "@/components/shell";
import { useLoad } from "@/components/use-load";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { usd, projectCents, whenLabel } from "@/lib/money";
import { adminAct, adminBoard, type AdminAct, type AdminBoard } from "@/lib/studio";
import { notify, requestNotifyPermission, playCoolSound } from "@/lib/notify";

export const Route = createFileRoute("/admin")({
  component: () => (
    <Guard>
      <AdminPage />
    </Guard>
  ),
});

const TABS = [
  ["lineup", "Lineup"],
  ["plans", "Plans"],
  ["returns", "Returns"],
  ["book", "Book"],
  ["people", "People"],
  ["desk", "Desk"],
] as const;

type Tab = (typeof TABS)[number][0];

function AdminPage() {
  const { profile, profileReady } = useStudio();
  const board = useLoad(adminBoard, "desk", 8000);
  const [tab, setTab] = useState<Tab>("lineup");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(data: AdminAct) {
    setBusy(true);
    setError(null);
    try {
      await adminAct({ data });
      board.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!profileReady) return <Skeleton />;
  if (profile?.role !== "admin") {
    return (
      <div className="space-y-3">
        <h1 className="text-3xl font-medium">Studio desk</h1>
        <p className="text-muted">This desk is private.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="kicker text-xs text-muted">FULL CONTROL</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight">Studio desk</h1>
        <p className="mt-2 text-sm text-muted">
          Anchors, plans, live returns, orders, people, and private replies.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={ghostBtn} onClick={() => void requestNotifyPermission()}>
            Enable alerts
          </button>
          <button type="button" className={ghostBtn} onClick={() => playCoolSound()}>
            Test sound
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "tap min-h-11 shrink-0 rounded-full bg-fg px-4 text-sm text-bg"
                : "tap min-h-11 shrink-0 rounded-full border border-line px-4 text-sm"
            }
          >
            {label}
          </button>
        ))}
      </div>
      {board.pending ? <Skeleton /> : null}
      {board.error ? <Note>{board.error}</Note> : null}
      {error ? <Note>{error}</Note> : null}
      {board.data && tab === "lineup" ? <Lineup board={board.data} busy={busy} run={run} /> : null}
      {board.data && tab === "plans" ? <Plans board={board.data} busy={busy} run={run} /> : null}
      {board.data && tab === "returns" ? <Returns board={board.data} busy={busy} run={run} /> : null}
      {board.data && tab === "book" ? <Book board={board.data} busy={busy} run={run} /> : null}
      {board.data && tab === "people" ? <People board={board.data} busy={busy} run={run} /> : null}
      {board.data && tab === "desk" ? <Desk board={board.data} busy={busy} run={run} /> : null}
    </div>
  );
}

function Lineup({
  board,
  busy,
  run,
}: {
  board: AdminBoard;
  busy: boolean;
  run: (data: AdminAct) => Promise<boolean>;
}) {
  return (
    <ul className="space-y-4">
      {board.vehicles.map((vehicle) => (
        <li key={vehicle.id} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex gap-3">
            <img src={vehicle.image} alt="" className="h-16 w-24 rounded-lg object-cover" />
            <div>
              <h2 className="font-medium">{vehicle.name}</h2>
              <p className="text-sm tabular-nums text-muted">Anchor {usd(vehicle.anchorCents)}</p>
            </div>
          </div>
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              const dollars = Number(fd.get("dollars"));
              const range = fd.get("rangeMi");
              const rangeMi = range === "" || range == null ? null : Number(range);
              if (!Number.isInteger(dollars)) return;
              void run({
                type: "model",
                id: vehicle.id,
                name: String(fd.get("name") ?? ""),
                tagline: String(fd.get("tagline") ?? ""),
                kind: String(fd.get("kind") ?? ""),
                image: String(fd.get("image") ?? ""),
                anchorCents: dollars * 100,
                rangeMi: Number.isInteger(rangeMi) ? rangeMi : null,
                zeroToSixty: String(fd.get("zeroToSixty") ?? ""),
                drive: String(fd.get("drive") ?? ""),
                status: String(fd.get("status") ?? ""),
                quoteMode: (String(fd.get("quoteMode") ?? "live") === "target" || String(fd.get("quoteMode") ?? "live") === "signal"
                  ? String(fd.get("quoteMode"))
                  : "live") as "live" | "target" | "signal",
                blurb: String(fd.get("blurb") ?? ""),
                sortOrder: Number(fd.get("sortOrder") ?? vehicle.sortOrder),
              });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="name" defaultValue={vehicle.name} placeholder="Name" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="tagline" defaultValue={vehicle.tagline} placeholder="Tagline" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="kind" defaultValue={vehicle.kind} placeholder="Kind" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="image" defaultValue={vehicle.image} placeholder="Image path" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="dollars" type="number" defaultValue={Math.round(vehicle.anchorCents / 100)} placeholder="Anchor $" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
              <input name="rangeMi" type="number" defaultValue={vehicle.rangeMi ?? ""} placeholder="Range (mi)" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
              <input name="zeroToSixty" defaultValue={vehicle.zeroToSixty} placeholder="0-60" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="drive" defaultValue={vehicle.drive} placeholder="Drive" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <select name="status" defaultValue={vehicle.status} className="min-h-11 rounded-xl border border-line bg-surface-2 px-3">
                <option value="available">In production</option>
                <option value="limited">Limited</option>
                <option value="coming">Coming</option>
                <option value="closed">Closed</option>
              </select>
              <select name="quoteMode" defaultValue={vehicle.quoteMode} className="min-h-11 rounded-xl border border-line bg-surface-2 px-3">
                <option value="live">Price</option>
                <option value="target">Target</option>
                <option value="signal">Signal</option>
              </select>
              <input name="sortOrder" type="number" defaultValue={vehicle.sortOrder} placeholder="Sort" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
            </div>
            <textarea name="blurb" defaultValue={vehicle.blurb} rows={3} placeholder="Blurb" className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm" />
            <button className={primaryBtn} disabled={busy} type="submit">
              Save vehicle
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function Plans({
  board,
  busy,
  run,
}: {
  board: AdminBoard;
  busy: boolean;
  run: (data: AdminAct) => Promise<boolean>;
}) {
  return (
    <ul className="space-y-4">
      {board.plans.map((plan) => (
        <li key={plan.id} className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-medium">{plan.name}</h2>
          <p className="text-sm text-muted">{plan.summary}</p>
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              const min = Number(fd.get("min"));
              const apr = Number(fd.get("apr"));
              if (!Number.isInteger(min) || !Number.isFinite(apr)) return;
              void run({
                type: "plan",
                id: plan.id,
                name: String(fd.get("name") ?? ""),
                horizonMonths: Number(fd.get("horizonMonths") ?? plan.horizonMonths),
                minCents: min * 100,
                aprBps: Math.round(apr * 100),
                risk: String(fd.get("risk") ?? ""),
                summary: String(fd.get("summary") ?? ""),
                active: fd.get("active") === "on",
                sortOrder: Number(fd.get("sortOrder") ?? plan.sortOrder),
              });
            }}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="name" defaultValue={plan.name} placeholder="Name" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="risk" defaultValue={plan.risk} placeholder="Risk" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3" />
              <input name="horizonMonths" type="number" defaultValue={plan.horizonMonths} placeholder="Horizon (months)" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
              <input name="sortOrder" type="number" defaultValue={plan.sortOrder} placeholder="Sort" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
              <input name="min" type="number" defaultValue={plan.minCents / 100} placeholder="Min $" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
              <input name="apr" type="number" step="0.1" defaultValue={(plan.aprBps / 100).toFixed(1)} placeholder="APR %" className="min-h-11 rounded-xl border border-line bg-surface-2 px-3 tabular-nums" />
            </div>
            <textarea name="summary" defaultValue={plan.summary} rows={2} placeholder="Summary" className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm" />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input name="active" type="checkbox" defaultChecked={plan.active} />
              Open for new allocations
            </label>
            <button className={primaryBtn} disabled={busy} type="submit">
              Save plan
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

function Returns({
  board,
  busy,
  run,
}: {
  board: AdminBoard;
  busy: boolean;
  run: (data: AdminAct) => Promise<boolean>;
}) {
  const [planId, setPlanId] = useState(board.plans[0]?.id ?? "");
  const plan = board.plans.find((p) => p.id === planId) ?? board.plans[0];
  const [apr, setApr] = useState(plan ? (plan.aprBps / 100).toFixed(1) : "8.0");
  const [sample, setSample] = useState("10000");
  const [note, setNote] = useState<string | null>(null);

  const aprNum = Number(apr);
  const aprBps = Number.isFinite(aprNum) ? Math.round(aprNum * 100) : 0;
  const amount = Number(sample);
  const amountCents = Number.isInteger(amount) ? amount * 100 : 0;
  const preview = plan && amountCents > 0 ? projectCents(amountCents, aprBps, plan.horizonMonths) : 0;
  const gain = preview - amountCents;

  async function broadcast() {
    if (!plan) return;
    const ok = await run({
      type: "plan",
      id: plan.id,
      name: plan.name,
      horizonMonths: plan.horizonMonths,
      minCents: plan.minCents,
      aprBps,
      risk: plan.risk,
      summary: plan.summary,
      active: plan.active,
      sortOrder: plan.sortOrder,
    });
    if (ok) {
      setNote(`Broadcast live — ${plan.name} now at ${aprNum.toFixed(1)}%`);
      notify("Returns updated", `${plan.name} is now ${aprNum.toFixed(1)}% APR`);
    }
  }

  if (!plan) return <p className="text-sm text-muted">No plans yet.</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <p className="kicker text-xs text-muted">LIVE RETURNS</p>
        <h2 className="mt-1 text-2xl font-medium">Preview before you broadcast</h2>
        <p className="mt-1 text-sm text-muted">
          Set an APR. See the return. Then push it live so members see the new number.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={ghostBtn} onClick={() => void requestNotifyPermission().then(() => playCoolSound())}>
            Enable alerts
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Plan</span>
          <select
            value={plan.id}
            onChange={(e) => {
              const next = board.plans.find((p) => p.id === e.target.value);
              setPlanId(e.target.value);
              if (next) setApr((next.aprBps / 100).toFixed(1));
            }}
            className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3"
          >
            {board.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {(p.aprBps / 100).toFixed(1)}% · {p.horizonMonths} mo
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">New APR %</span>
          <input
            type="number"
            step="0.1"
            value={apr}
            onChange={(e) => setApr(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3 tabular-nums"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">Sample amount ($)</span>
          <input
            type="number"
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface-2 px-3 tabular-nums"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-accent/40 bg-surface p-5">
        <p className="text-xs text-muted">Projected at horizon</p>
        <p className="mt-1 text-4xl font-medium tabular-nums">{usd(preview)}</p>
        <p className="mt-1 text-sm text-muted">
          From {usd(amountCents)} · gain {usd(gain)} · {plan.horizonMonths} months
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={accentBtn} disabled={busy || !Number.isFinite(aprNum)} onClick={() => void broadcast()}>
            Broadcast live APR
          </button>
          <button type="button" className={ghostBtn} onClick={() => playCoolSound()}>
            Test sound
          </button>
        </div>
        {note ? <Note>{note}</Note> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[5000, 10000, 25000].map((dollars) => {
          const cents = dollars * 100;
          const back = projectCents(cents, aprBps, plan.horizonMonths);
          return (
            <button
              key={dollars}
              type="button"
              onClick={() => setSample(String(dollars))}
              className="rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-fg/40 active:scale-[0.99]"
            >
              <p className="text-xs text-muted">${dollars.toLocaleString()}</p>
              <p className="mt-1 text-xl font-medium tabular-nums">{usd(back)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Book({
  board,
  busy,
  run,
}: {
  board: AdminBoard;
  busy: boolean;
  run: (data: AdminAct) => Promise<boolean>;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Allocations</h2>
        {board.investments.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        <ul className="space-y-3">
          {board.investments.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.planName}</h3>
                  <p className="text-sm text-muted">{row.name} · {row.email}</p>
                  <p className="tabular-nums">{usd(row.amountCents)}</p>
                </div>
                <StatusPill status={row.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status !== "active" ? (
                  <button type="button" className={primaryBtn} disabled={busy} onClick={() => void run({ type: "investment", id: row.id, status: "active" })}>
                    Activate
                  </button>
                ) : null}
                {row.status === "pending" ? (
                  <button type="button" className={ghostBtn} disabled={busy} onClick={() => void run({ type: "investment", id: row.id, status: "declined" })}>
                    Decline
                  </button>
                ) : null}
                {row.status === "active" ? (
                  <button type="button" className={ghostBtn} disabled={busy} onClick={() => void run({ type: "investment", id: row.id, status: "closed" })}>
                    Close
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Model investments</h2>
        {board.stakes.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        <ul className="space-y-3">
          {board.stakes.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.modelName}</h3>
                  <p className="text-sm text-muted">{row.name} · {row.email}</p>
                  <p className="tabular-nums">
                    {usd(row.amountCents)} · {row.horizonMonths} mo · {(row.aprBps / 100).toFixed(1)}%
                  </p>
                </div>
                <StatusPill status={row.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status !== "active" ? (
                  <button type="button" className={primaryBtn} disabled={busy} onClick={() => void run({ type: "stake", id: row.id, status: "active" })}>
                    Activate
                  </button>
                ) : null}
                {row.status === "pending" ? (
                  <button type="button" className={ghostBtn} disabled={busy} onClick={() => void run({ type: "stake", id: row.id, status: "declined" })}>
                    Decline
                  </button>
                ) : null}
                {row.status === "active" ? (
                  <button type="button" className={ghostBtn} disabled={busy} onClick={() => void run({ type: "stake", id: row.id, status: "closed" })}>
                    Close
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Vehicle orders</h2>
        {board.reservations.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        <ul className="space-y-3">
          {board.reservations.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.modelName}</h3>
                  <p className="text-sm text-muted">{row.color}</p>
                  <p className="text-sm text-muted">
                    {row.payMethod === "finance" ? `Finance · ${row.termMonths ?? "—"} mo` : "Cash"}
                    {row.city ? ` · ${row.city}` : ""}
                  </p>
                  {row.phone ? <p className="text-sm text-muted">{row.buyerName || row.name} · {row.phone}</p> : null}
                  <p className="text-sm text-muted">{row.contactEmail || row.email}</p>
                </div>
                <StatusPill status={row.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {row.status === "requested" ? (
                  <button type="button" className={primaryBtn} disabled={busy} onClick={() => void run({ type: "reservation", id: row.id, status: "confirmed" })}>
                    Confirm
                  </button>
                ) : null}
                {row.status !== "cancelled" ? (
                  <button type="button" className={ghostBtn} disabled={busy} onClick={() => void run({ type: "reservation", id: row.id, status: "cancelled" })}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function People({
  board,
  busy,
  run,
}: {
  board: AdminBoard;
  busy: boolean;
  run: (data: AdminAct) => Promise<boolean>;
}) {
  return (
    <ul className="space-y-3">
      {board.people.map((person) => (
        <li key={person.userId} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
          <Avatar src={person.avatar} name={person.name} />
          <div>
          <h2 className="font-medium">{person.name}</h2>
          <p className="break-all text-sm text-muted">{person.email}</p>
          <p className="mt-1 text-xs text-muted">{person.role === "admin" ? "Admin" : "Member"} · {whenLabel(person.createdAt)}</p>
          <button
            type="button"
            className={ghostBtn + " mt-3"}
            disabled={busy}
            onClick={() =>
              void run({
                type: "role",
                userId: person.userId,
                role: person.role === "admin" ? "member" : "admin",
              })
            }
          >
            {person.role === "admin" ? "Make member" : "Make admin"}
          </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Desk({
  board,
  busy,
  run,
}: {
  board: AdminBoard;
  busy: boolean;
  run: (data: AdminAct) => Promise<boolean>;
}) {
  const { user } = useCurrentUserState();
  const threads = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; email: string; avatar: string; last: string; lastAt: string; waiting: boolean }>();
    for (const message of board.messages) {
      const person = board.people.find((item) => item.userId === message.userId);
      map.set(message.userId, {
        userId: message.userId,
        name: person?.name ?? "Member",
        email: person?.email ?? "",
        avatar: person?.avatar ?? "",
        last: message.body,
        lastAt: message.createdAt,
        waiting: message.senderId === message.userId,
      });
    }
    return [...map.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }, [board.messages, board.people]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const open = threads.find((thread) => thread.userId === openId) ?? null;
  const messages = board.messages.filter((message) => message.userId === openId);

  if (open) {
    return (
      <div className="space-y-3">
        <button type="button" className="text-sm text-muted" onClick={() => setOpenId(null)}>
          All threads
        </button>
        <div className="flex items-center gap-3">
          <Avatar src={open.avatar} name={open.name} />
          <div>
            <h2 className="text-xl font-medium">{open.name}</h2>
            <p className="break-all text-sm text-muted">{open.email}</p>
          </div>
        </div>
        <ul className="space-y-3">
          {messages.map((message) => {
            const mine = message.senderId === user?.id;
            return (
              <li key={message.id} className={mine ? "flex justify-end" : "flex items-end gap-2"}>
                {mine ? null : <Avatar src={message.senderAvatar || open.avatar} name={open.name} className="size-8" />}
                <div className={mine ? "max-w-[85%] rounded-2xl bg-accent px-4 py-3 text-accent-fg" : "max-w-[85%] rounded-2xl border border-line bg-surface px-4 py-3"}>
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p className="mt-2 text-xs opacity-70">{whenLabel(message.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const text = body.trim();
            if (!text) return;
            void run({ type: "reply", userId: open.userId, body: text }).then((ok) => {
              if (ok) setBody("");
            });
          }}
        >
          <textarea
            value={body}
            rows={2}
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Private reply"
            className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2"
          />
          <button type="submit" className={primaryBtn} disabled={busy || body.trim().length === 0}>
            Send
          </button>
        </form>
      </div>
    );
  }

  if (threads.length === 0) {
    return <p className="text-sm text-muted">No private threads yet. They appear when a member writes.</p>;
  }

  return (
    <ul className="space-y-3">
      {threads.map((thread) => (
        <li key={thread.userId}>
          <button type="button" onClick={() => setOpenId(thread.userId)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left">
            <Avatar src={thread.avatar} name={thread.name} />
            <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{thread.name}</h2>
              {thread.waiting ? <span className="size-2 rounded-full bg-accent" /> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{thread.last}</p>
            <p className="mt-2 text-xs text-muted">{whenLabel(thread.lastAt)}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
