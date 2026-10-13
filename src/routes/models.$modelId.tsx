import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { fieldClass, ghostBtn, Note, primaryBtn, Specs, StatusPill } from "@/components/bits";
import { LivePrice } from "@/components/live-price";
import { useStudio } from "@/components/shell";
import { useLoad } from "@/components/use-load";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { monthlyPayment, projectCents, usd } from "@/lib/money";
import { FINANCE_APR_BPS, FINANCE_TERMS, INVEST_TIERS, type InvestTier } from "@/lib/offers";
import { PAINTS, getVehicle, investModel, shopVehicle } from "@/lib/studio";

type ModelSearch = { intent: "shop" | "invest" | "" };
type PayMethod = "cash" | "finance";

const DRAFT_KEY = "ti-offer-draft";

type Draft = {
  modelId: string;
  buyerName: string;
  phone: string;
  email: string;
  city: string;
  color: (typeof PAINTS)[number];
  payMethod: PayMethod;
  termMonths: number;
  tierId: string;
};

export const Route = createFileRoute("/models/$modelId")({
  validateSearch: (search: Record<string, unknown>): ModelSearch => ({
    intent: search.intent === "shop" || search.intent === "invest" ? search.intent : "",
  }),
  component: ModelPage,
});

function ModelPage() {
  const { modelId } = Route.useParams();
  const { intent } = Route.useSearch();
  const load = useCallback(() => getVehicle({ data: modelId }), [modelId]);
  const { data, error, pending } = useLoad(load, modelId);
  const navigate = useNavigate();

  if (pending) {
    return <div className="h-72 animate-pulse rounded-2xl bg-surface" />;
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted">
          <ChevronLeft className="size-4" /> Lineup
        </Link>
        <p className="text-sm text-accent">{error ?? "That vehicle is not on the lineup."}</p>
      </div>
    );
  }

  return (
    <article className="space-y-5">
      <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted">
        <ChevronLeft className="size-4" /> Lineup
      </Link>
      <img src={data.image} alt="" className="aspect-video w-full rounded-2xl object-cover" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{data.kind}</p>
          <h1 className="text-4xl font-medium tracking-tight">{data.name}</h1>
          <p className="mt-2 text-muted">{data.tagline}</p>
        </div>
        <StatusPill status={data.status} />
      </div>
      <Specs vehicle={data} />
      <LivePrice anchorCents={data.anchorCents} mode={data.quoteMode} large />
      <p className="max-w-xl leading-relaxed text-muted">{data.blurb}</p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={(intent === "shop" ? primaryBtn : ghostBtn) + " w-full"}
          onClick={() =>
            void navigate({
              to: "/models/$modelId",
              params: { modelId },
              search: { intent: "shop" },
            })
          }
        >
          Shop
        </button>
        <button
          type="button"
          className={(intent === "invest" ? primaryBtn : ghostBtn) + " w-full"}
          onClick={() =>
            void navigate({
              to: "/models/$modelId",
              params: { modelId },
              search: { intent: "invest" },
            })
          }
        >
          Invest now
        </button>
      </div>

      {intent === "shop" ? <ShopForm modelId={modelId} modelName={data.name} anchorCents={data.anchorCents} /> : null}
      {intent === "invest" ? <InvestForm modelId={modelId} modelName={data.name} /> : null}
      {intent === "" ? (
        <p className="text-sm text-muted">Shop to order this car, or invest now to pick an amount and return.</p>
      ) : null}
    </article>
  );
}

function ShopForm({
  modelId,
  modelName,
  anchorCents,
}: {
  modelId: string;
  modelName: string;
  anchorCents: number;
}) {
  const { user, isPending } = useCurrentUserState();
  const { profile } = useStudio();
  const navigate = useNavigate();
  const [buyerName, setBuyerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [color, setColor] = useState<(typeof PAINTS)[number]>("Pearl White");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [termMonths, setTermMonths] = useState<number>(60);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      if (draft.modelId !== modelId) return;
      setBuyerName(draft.buyerName);
      setPhone(draft.phone);
      setEmail(draft.email);
      setCity(draft.city);
      setColor(draft.color);
      setPayMethod(draft.payMethod);
      setTermMonths(draft.termMonths);
    } catch {
      /* ignore broken drafts */
    }
  }, [modelId]);

  useEffect(() => {
    if (!profile) return;
    setBuyerName((value) => value || profile.name);
    setEmail((value) => value || profile.email);
  }, [profile]);

  const monthly = monthlyPayment(anchorCents, FINANCE_APR_BPS, termMonths);

  function draft(): Draft {
    return {
      modelId,
      buyerName,
      phone,
      email,
      city,
      color,
      payMethod,
      termMonths,
      tierId: INVEST_TIERS[0].id,
    };
  }

  async function submit() {
    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft()));
      } catch {
        /* private mode */
      }
      await navigate({
        to: "/login",
        search: { next: `/models/${modelId}?intent=shop` },
      });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      await shopVehicle({
        data: {
          modelId,
          color,
          buyerName,
          phone,
          email,
          city,
          payMethod,
          termMonths: payMethod === "finance" ? termMonths : null,
        },
      });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      await navigate({ to: "/messages", search: { about: "" } });
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div>
        <h2 className="text-lg font-medium">Shop {modelName}</h2>
        <p className="mt-1 text-sm text-muted">Your details go straight to the admin chat.</p>
      </div>
      <label className="block text-sm text-muted">
        Full name
        <input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className={`${fieldClass} mt-1`} autoComplete="name" />
      </label>
      <label className="block text-sm text-muted">
        Phone
        <input value={phone} onChange={(event) => setPhone(event.target.value)} className={`${fieldClass} mt-1`} inputMode="tel" autoComplete="tel" />
      </label>
      <label className="block text-sm text-muted">
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} className={`${fieldClass} mt-1`} type="email" autoComplete="email" />
      </label>
      <label className="block text-sm text-muted">
        City
        <input value={city} onChange={(event) => setCity(event.target.value)} className={`${fieldClass} mt-1`} autoComplete="address-level2" />
      </label>
      <div>
        <p className="text-sm text-muted">Color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PAINTS.map((paint) => (
            <button
              key={paint}
              type="button"
              onClick={() => setColor(paint)}
              className={
                color === paint
                  ? "tap min-h-11 rounded-full bg-fg px-4 text-sm text-bg"
                  : "tap min-h-11 rounded-full border border-line px-4 text-sm"
              }
            >
              {paint}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-muted">Payment</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className={payMethod === "cash" ? primaryBtn : ghostBtn} onClick={() => setPayMethod("cash")}>
            Cash
          </button>
          <button type="button" className={payMethod === "finance" ? primaryBtn : ghostBtn} onClick={() => setPayMethod("finance")}>
            Finance
          </button>
        </div>
      </div>
      {payMethod === "cash" ? (
        <p className="text-2xl font-medium tabular-nums">{usd(anchorCents)}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {FINANCE_TERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setTermMonths(term)}
                className={
                  termMonths === term
                    ? "tap min-h-11 rounded-full bg-fg px-4 text-sm text-bg"
                    : "tap min-h-11 rounded-full border border-line px-4 text-sm"
                }
              >
                {term} mo
              </button>
            ))}
          </div>
          <p className="text-2xl font-medium tabular-nums">{usd(monthly)}<span className="text-base font-normal text-muted"> / mo</span></p>
          <p className="text-xs text-muted">{(FINANCE_APR_BPS / 100).toFixed(2)}% · {termMonths} months</p>
        </div>
      )}
      {note ? <Note>{note}</Note> : null}
      <button
        type="button"
        className={primaryBtn + " w-full"}
        disabled={
          busy ||
          isPending ||
          buyerName.trim().length < 2 ||
          phone.trim().length < 7 ||
          !email.includes("@") ||
          city.trim().length < 2
        }
        onClick={() => void submit()}
      >
        {busy ? "Opening chat…" : user ? "Open chat with admin" : "Sign in to continue"}
      </button>
    </section>
  );
}

function InvestForm({ modelId, modelName }: { modelId: string; modelName: string }) {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [tierId, setTierId] = useState<string>(INVEST_TIERS[2].id);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = INVEST_TIERS.find((tier) => tier.id === tierId) ?? INVEST_TIERS[0];

  async function submit() {
    if (!user) {
      await navigate({
        to: "/login",
        search: { next: `/models/${modelId}?intent=invest` },
      });
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      await investModel({ data: { modelId, tierId: selected.id } });
      await navigate({ to: "/messages", search: { about: "" } });
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div>
        <h2 className="text-lg font-medium">Invest in {modelName}</h2>
        <p className="mt-1 text-sm text-muted">Pick an amount. The return is shown before chat opens with admin.</p>
      </div>
      <ul className="space-y-2">
        {INVEST_TIERS.map((tier) => (
          <li key={tier.id}>
            <TierButton tier={tier} selected={tier.id === selected.id} onSelect={() => setTierId(tier.id)} />
          </li>
        ))}
      </ul>
      {note ? <Note>{note}</Note> : null}
      <button type="button" className={primaryBtn + " w-full"} disabled={busy || isPending} onClick={() => void submit()}>
        {busy ? "Opening chat…" : user ? `Continue with ${usd(selected.amountCents)}` : "Sign in to continue"}
      </button>
    </section>
  );
}

function TierButton({
  tier,
  selected,
  onSelect,
}: {
  tier: InvestTier;
  selected: boolean;
  onSelect: () => void;
}) {
  const back = projectCents(tier.amountCents, tier.aprBps, tier.horizonMonths);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "w-full rounded-2xl border border-accent bg-surface-2 p-4 text-left"
          : "w-full rounded-2xl border border-line p-4 text-left"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">{tier.name}</p>
          <p className="text-xl font-medium tabular-nums">{usd(tier.amountCents)}</p>
        </div>
        <p className="tabular-nums">{(tier.aprBps / 100).toFixed(1)}%</p>
      </div>
      <p className="mt-2 text-sm text-muted">
        {tier.horizonMonths} months · return {usd(back - tier.amountCents)}
      </p>
      <p className="text-sm">{usd(back)} at maturity</p>
    </button>
  );
}
