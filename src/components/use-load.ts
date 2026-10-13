import { useCallback, useEffect, useState } from "react";

export function useLoad<T>(load: () => Promise<T>, key: string, interval?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    const run = () => {
      load()
        .then((value) => {
          if (!live) return;
          setData(value);
          setError(null);
        })
        .catch((err: unknown) => {
          if (!live) return;
          setError(err instanceof Error ? err.message : "Could not load");
        });
    };
    run();
    const id = interval ? window.setInterval(run, interval) : undefined;
    return () => {
      live = false;
      if (id) window.clearInterval(id);
    };
  }, [key, interval, load, nonce]);

  return { data, error, refresh, pending: data === null && error === null };
}
