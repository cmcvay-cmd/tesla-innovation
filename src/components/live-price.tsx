import { usd } from "@/lib/money";
import type { QuoteMode } from "@/lib/studio";

export function LivePrice({
  anchorCents,
  mode,
  large = false,
}: {
  anchorCents: number;
  mode: QuoteMode;
  large?: boolean;
}) {
  const label = mode === "target" ? "Target" : mode === "signal" ? "Signal" : "Price";

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={
            mode === "live"
              ? "size-1.5 rounded-full bg-accent"
              : "size-1.5 rounded-full bg-muted"
          }
        />
        <span className="kicker text-xs text-muted">{label}</span>
      </div>
      <p className={large ? "mt-1 text-4xl font-medium tabular-nums" : "mt-1 text-2xl font-medium tabular-nums"}>
        {usd(anchorCents)}
      </p>
      <p className="text-xs text-muted">
        {mode === "live" ? "US anchor" : mode === "target" ? "Published target" : "Quoted figure"}
      </p>
    </div>
  );
}
