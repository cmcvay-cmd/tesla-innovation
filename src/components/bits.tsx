import type { ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { statusLabel } from "@/lib/money";
import type { Vehicle } from "@/lib/studio";

export const fieldClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg";

export const primaryBtn =
  "tap inline-flex min-h-12 items-center justify-center rounded-2xl bg-accent px-6 text-sm font-semibold text-accent-fg shadow-[0_0_0_1px_rgb(227_25_55/0.4),0_8px_24px_-12px_rgb(227_25_55/0.6)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50";

export const ghostBtn =
  "tap inline-flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface-2 px-5 text-sm font-medium text-fg transition hover:bg-surface hover:border-fg/30 active:scale-[0.98] disabled:opacity-50";

export const accentBtn =
  "tap inline-flex min-h-12 items-center justify-center rounded-2xl bg-fg px-6 text-sm font-semibold text-bg transition hover:brightness-95 active:scale-[0.98] disabled:opacity-50";


export function Skeleton() {
  return (
    <div className="mt-6 space-y-3" aria-hidden>
      <div className="h-44 animate-pulse rounded-2xl bg-surface" />
      <div className="h-44 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const hot = status === "limited" || status === "declined" || status === "coming";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs text-muted">
      <span className={hot ? "size-1.5 rounded-full bg-accent" : "size-1.5 rounded-full bg-fg"} />
      {statusLabel(status)}
    </span>
  );
}

export function Specs({ vehicle }: { vehicle: Vehicle }) {
  const bits = [
    vehicle.rangeMi ? `${vehicle.rangeMi} mi` : null,
    vehicle.zeroToSixty ? `0–60 ${vehicle.zeroToSixty}` : null,
    vehicle.drive,
  ].filter((bit): bit is string => Boolean(bit));
  return <p className="text-sm text-muted">{bits.join(" · ")}</p>;
}

export function Guard({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <Skeleton />;
  if (!user) return <RedirectToSignIn />;
  return children;
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm text-accent">{children}</p>;
}

export function Avatar({
  src,
  name,
  className = "size-10",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "•";
  if (src) {
    return <img src={src} alt="" className={`${className} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-medium text-muted`}
    >
      {initials}
    </span>
  );
}
