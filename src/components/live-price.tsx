import { useEffect, useState } from "react";
import { indicativeCents, usd } from "@/lib/money";
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
  const [cents, setCents] = useState(anchorCents);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    if (mode !== "live") {
      setCents(anchorCents);
      setTicking(false);
      return;
    }
    const tick = () => {
      setCents(indicativeCents(anchorCents));
      setTicking(true);
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [anchorCents, mode]);

  const delta = cents - anchorCents;
  const label = mode === "target" ? "Target" : mode === "signal" ? "Signal" : "Live";

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={
            mode === "live"
              ? "pulse-dot size-1.5 rounded-full bg-accent"
              : "size-1.5 rounded-full bg-muted"
          }
        />
        <span className="kicker text-xs text-muted">{label}</span>
      </div>
      <p className={large ? "mt-1 text-4xl font-medium tabular-nums" : "mt-1 text-2xl font-medium tabular-nums"}>
        {usd(mode === "live" ? cents : anchorCents)}
      </p>
      {ticking && mode === "live" ? (
        <p className="text-xs tabular-nums text-muted">
          {delta === 0
            ? "At the anchor"
            : `${delta > 0 ? "+" : "−"}${usd(Math.abs(delta))} vs anchor`}
        </p>
      ) : (
        <p className="text-xs text-muted">
          {mode === "live" ? "US anchor" : "Quoted figure"}
        </p>
      )}
    </div>
  );
}
