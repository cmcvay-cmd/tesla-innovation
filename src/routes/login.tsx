import { useState, type FormEvent } from "react";
import { createFileRoute, Navigate, useNavigate, useRouter } from "@tanstack/react-router";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureProfile } from "@/lib/studio";
import { Note, primaryBtn } from "@/components/bits";

type LoginSearch = { next: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const next = typeof search.next === "string" ? search.next : "";
    if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return { next: "" };
    return { next: next.slice(0, 200) };
  },
  component: LoginPage,
});

function goAfterLogin(next: string, navigate: ReturnType<typeof useNavigate>) {
  const model = next.match(/^\/models\/([a-z0-9-]{2,40})\?intent=(shop|invest)$/);
  if (model && (model[2] === "shop" || model[2] === "invest")) {
    return navigate({
      to: "/models/$modelId",
      params: { modelId: model[1] },
      search: { intent: model[2] },
    });
  }
  return navigate({ to: "/" });
}

function LoginPage() {
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();

  if (isPending) return <div className="min-h-screen bg-bg" />;
  if (user) {
    const model = next.match(/^\/models\/([a-z0-9-]{2,40})\?intent=(shop|invest)$/);
    if (model && (model[2] === "shop" || model[2] === "invest")) {
      return (
        <Navigate
          to="/models/$modelId"
          params={{ modelId: model[1] }}
          search={{ intent: model[2] }}
        />
      );
    }
    return <Navigate to="/" />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(result.error.message ?? "Could not open the account");
        return;
      }
      await ensureProfile();
      await router.invalidate();
      await goAfterLogin(next, navigate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-bg">
      <img src="/fleet/model-s.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="opening-scrim" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-end px-4 py-8">
        <p className="kicker text-xs text-muted">TESLA INNOVATION</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight">
          {mode === "up" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Email and password. The account opens immediately.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={mode === "up" ? primaryBtn : "min-h-11 rounded-full border border-line text-sm"}
            onClick={() => setMode("up")}
          >
            Create
          </button>
          <button
            type="button"
            className={mode === "in" ? primaryBtn : "min-h-11 rounded-full border border-line text-sm"}
            onClick={() => setMode("in")}
          >
            Sign in
          </button>
        </div>
        <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
          {mode === "up" ? (
            <label className="block text-sm text-muted">
              Name
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg"
              />
            </label>
          ) : null}
          <label className="block text-sm text-muted">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg"
            />
          </label>
          <label className="block text-sm text-muted">
            Password
            <input
              required
              type="password"
              minLength={8}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-fg"
            />
          </label>
          {error ? <Note>{error}</Note> : null}
          <button type="submit" className={primaryBtn + " w-full"} disabled={busy}>
            {busy ? "Opening…" : mode === "up" ? "Create account" : "Sign in"}
          </button>
        </form>
        <div className="mt-6 space-y-2">
          <p className="text-xs text-muted">Or continue with</p>
          {GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              className="tap min-h-11 w-full rounded-full border border-line bg-surface text-sm"
              onClick={() => void signIn(provider.providerId, { callbackURL: next || "/" })}
            >
              Continue with {provider.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
