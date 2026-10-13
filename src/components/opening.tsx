import { useCallback, useEffect, useState } from "react";

export function Opening() {
  const [phase, setPhase] = useState<"show" | "leave" | "gone">("show");

  const leave = useCallback(() => {
    try {
      sessionStorage.setItem("ti-seen", "1");
    } catch {
      /* private mode */
    }
    setPhase((current) => (current === "gone" ? current : "leave"));
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("ti-seen") === "1") {
        setPhase("gone");
        return;
      }
    } catch {
      /* ignore */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(leave, reduce ? 900 : 6800);
    return () => window.clearTimeout(timer);
  }, [leave]);

  useEffect(() => {
    if (phase !== "leave") return;
    const timer = window.setTimeout(() => setPhase("gone"), 420);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className={phase === "leave" ? "opening opening-leave" : "opening"}
      role="dialog"
      aria-label="Welcome to Tesla Innovation"
    >
      <img src="/fleet/cybertruck.jpg" alt="" className="opening-car" />
      <div className="opening-scrim" />
      <button type="button" className="opening-skip tap" onClick={leave}>
        Skip
      </button>
      <div className="opening-copy">
        <div className="hairline" />
        <p className="kicker rise d1 text-xs text-muted">STUDIO LINEUP</p>
        <h1 className="opening-title rise d2 mt-3">
          Tesla
          <br />
          Innovation
        </h1>
        <p className="rise d3 mt-4 max-w-md text-base text-fg">
          Shop the cars. Back the curve. A private line to the desk — never a public room.
        </p>
        <button type="button" className="tap rise d4 mt-6 min-h-11 rounded-full bg-accent px-6 text-sm font-medium text-accent-fg" onClick={leave}>
          Enter the studio
        </button>
      </div>
    </div>
  );
}
