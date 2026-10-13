export function usd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Shared studio tape: a few tenths of a percent around the published anchor. */
export function indicativeCents(anchorCents: number, at = Date.now()) {
  const t = at / 1000;
  const wave = Math.sin(t / 47) * 0.0024 + Math.sin(t / 11) * 0.0008;
  return Math.max(0, Math.round(anchorCents * (1 + wave)));
}

export function projectCents(amountCents: number, aprBps: number, months: number) {
  return Math.round(amountCents * (1 + (aprBps / 10000) * (months / 12)));
}

export function monthlyPayment(principalCents: number, aprBps: number, months: number) {
  if (months <= 0 || principalCents <= 0) return 0;
  const monthlyRate = aprBps / 120_000;
  if (monthlyRate === 0) return Math.round(principalCents / months);
  const growth = (1 + monthlyRate) ** months;
  return Math.round((principalCents * monthlyRate * growth) / (growth - 1));
}

export function markedCents(amountCents: number, aprBps: number, openedAt: string) {
  const opened = Date.parse(openedAt);
  if (!Number.isFinite(opened)) return amountCents;
  const days = Math.max(0, (Date.now() - opened) / 86_400_000);
  return Math.round(amountCents * (1 + (aprBps / 10000) * (days / 365)));
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    available: "In production",
    limited: "Limited",
    coming: "Coming",
    closed: "Closed",
    pending: "Awaiting desk",
    active: "Live",
    declined: "Declined",
    requested: "Requested",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

export function whenLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
