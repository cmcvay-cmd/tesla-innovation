import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Guard, Note, primaryBtn, Skeleton, StatusPill } from "@/components/bits";
import { useLoad } from "@/components/use-load";
import { markedCents, projectCents, usd, whenLabel } from "@/lib/money";
import { commitPlan, listPlans, myBook, type Plan } from "@/lib/studio";

export const Route = createFileRoute("/invest")({ component: () => <Guard><InvestPage /></Guard> });

function InvestPage() {
  const plans = useLoad(listPlans, "plans");
  const book = useLoad(myBook, "book");
  const [planId, setPlanId] = useState<string | null>(null);
  const [dollars, setDollars] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const list = plans.data ?? [];
  const selected = list.find((plan) => plan.id === (planId ?? list[0]?.id)) ?? null;
  const amount = Number(dollars);
  const amountCents = Number.isInteger(amount) ? amount * 100 : 0;

  const series = useMemo(() => {
    if (!selected || amountCents < selected.minCents) return [];
    const step = selected.horizonMonths > 24 ? 6 : selected.horizonMonths > 12 ? 3 : 1;
    const points: { label: string; value: number }[] = [];
    for (let month = 0; month <= selected.horizonMonths; month += step) {
      points.push({
        label: month === 0 ? "Now" : `${month} mo`,
        value: projectCents(amountCents, selected.aprBps, month),
      });
    }
    const last = points[points.length - 1];
    if (last && last.label !== `${selected.horizonMonths} mo`) {
      points.push({
        label: `${selected.horizonMonths} mo`,
        value: projectCents(amountCents, selected.aprBps, selected.horizonMonths),
      });
    }
    return points;
  }, [selected, amountCents]);

  async function commit() {
    if (!selected) return;
    setBusy(true);
    setNote(null);
    try {
      await commitPlan({ data: { planId: selected.id, amountCents } });
      setNote("Sent to the desk. It stays pending until it is opened.");
      setDollars("");
      book.refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not commit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker text-xs text-muted">THE DESK</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight">Invest with the studio</h1>
        <p className="mt-3 max-w-xl text-muted">
          Four sleeves. The desk reviews each one before it goes live.
        </p>
      </div>

      {plans.pending ? <Skeleton /> : null}
      {plans.error ? <Note>{plans.error}</Note> : null}

      <ul className="space-y-3">
        {plans.data?.map((plan) => (
          <li key={plan.id}>
            <button
              type="button"
              onClick={() => setPlanId(plan.id)}
              className={
                selected?.id === plan.id
                  ? "w-full rounded-2xl border border-accent bg-surface p-4 text-left"
                  : "w-full rounded-2xl border border-line bg-surface p-4 text-left"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{plan.risk}</p>
                  <h2 className="text-xl font-medium">{plan.name}</h2>
                </div>
                <p className="tabular-nums text-lg">{(plan.aprBps / 100).toFixed(1)}%</p>
              </div>
              <p className="mt-2 text-sm text-muted">{plan.summary}</p>
              <p className="mt-3 text-xs text-muted">
                From {usd(plan.minCents)} · {plan.horizonMonths} months
              </p>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <Commit
          plan={selected}
          dollars={dollars}
          setDollars={setDollars}
          series={series}
          busy={busy}
          onCommit={() => void commit()}
        />
      ) : null}
      {note ? <Note>{note}</Note> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Your book</h2>
        {book.pending ? <Skeleton /> : null}
        {book.data && book.data.investments.length === 0 ? (
          <p className="text-sm text-muted">No allocations yet.</p>
        ) : null}
        <ul className="space-y-3">
          {book.data?.investments.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.planName}</h3>
                  <p className="text-xs text-muted">{whenLabel(row.openedAt)}</p>
                </div>
                <StatusPill status={row.status} />
              </div>
              <p className="mt-3 text-2xl tabular-nums">
                {usd(row.status === "active" ? markedCents(row.amountCents, row.aprBps, row.openedAt) : row.amountCents)}
              </p>
              <p className="text-xs text-muted">
                {row.status === "active"
                  ? `Mark on ${usd(row.amountCents)} committed`
                  : `${usd(row.amountCents)} committed`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Commit({
  plan,
  dollars,
  setDollars,
  series,
  busy,
  onCommit,
}: {
  plan: Plan;
  dollars: string;
  setDollars: (value: string) => void;
  series: { label: string; value: number }[];
  busy: boolean;
  onCommit: () => void;
}) {
  const presets = [plan.minCents, plan.minCents * 2, plan.minCents * 5];
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-lg font-medium">Commit to {plan.name}</h2>
      <div className="flex flex-wrap gap-2">
        {presets.map((cents) => (
          <button
            key={cents}
            type="button"
            className="tap min-h-11 rounded-full border border-line px-4 text-sm"
            onClick={() => setDollars(String(cents / 100))}
          >
            {usd(cents)}
          </button>
        ))}
      </div>
      <label className="block text-sm text-muted">
        Whole dollars
        <input
          inputMode="numeric"
          value={dollars}
          onChange={(event) => setDollars(event.target.value.replace(/[^\d]/g, ""))}
          className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg tabular-nums"
          placeholder={String(plan.minCents / 100)}
        />
      </label>
      {series.length > 1 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <XAxis
                dataKey="label"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => usd(Number(value))}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 12,
                  color: "var(--color-fg)",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-accent)"
                fill="var(--color-accent)"
                fillOpacity={0.16}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted">Path over the horizon.</p>
        </div>
      ) : (
        <p className="text-sm text-muted">Enter at least {usd(plan.minCents)} to see the path.</p>
      )}
      <button type="button" className={primaryBtn} disabled={busy || series.length < 2} onClick={onCommit}>
        {busy ? "Sending…" : "Commit allocation"}
      </button>
    </section>
  );
}
