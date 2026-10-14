import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, MessageSquare, TrendingUp, UserRound, type LucideIcon } from "lucide-react";
import { SignedOut } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureProfile, inboxFlag, type Profile } from "@/lib/studio";
import { Opening } from "@/components/opening";

type StudioState = {
  profile: Profile | null;
  profileReady: boolean;
  unread: boolean;
  refreshProfile: () => void;
};

const StudioContext = createContext<StudioState>({
  profile: null,
  profileReady: false,
  unread: false,
  refreshProfile: () => undefined,
});

export function useStudio() {
  return useContext(StudioContext);
}

type Item = {
  to: "/" | "/invest" | "/messages" | "/account";
  label: string;
  icon: LucideIcon;
  on: (path: string) => boolean;
  dot?: boolean;
};

export function StudioProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [unread, setUnread] = useState(false);
  const [tick, setTick] = useState(0);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const refreshProfile = () => setTick((value) => value + 1);

  useEffect(() => {
    if (isPending) return;
    if (!user?.id) {
      setProfile(null);
      setProfileReady(true);
      setUnread(false);
      return;
    }
    let live = true;
    setProfileReady(false);
    ensureProfile()
      .then((next) => {
        if (live) setProfile(next);
      })
      .catch(() => {
        if (live) setProfile(null);
      })
      .finally(() => {
        if (live) setProfileReady(true);
      });
    return () => {
      live = false;
    };
  }, [user?.id, isPending, tick]);

  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    const run = () => {
      inboxFlag()
        .then((flag) => {
          if (live) setUnread(flag.unread);
        })
        .catch(() => undefined);
    };
    run();
    const id = window.setInterval(run, 8000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, [user?.id]);

  const bare = path === "/login";

  return (
    <StudioContext.Provider value={{ profile, profileReady, unread, refreshProfile }}>
      <Opening />
      {bare ? children : <Frame path={path}>{children}</Frame>}
    </StudioContext.Provider>
  );
}

function Frame({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header path={path} />
      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-40 md:pb-20">{children}</main>
      <Dock path={path} />
    </div>
  );
}

function itemsFor(unread: boolean): Item[] {
  return [
    {
      to: "/",
      label: "Shop",
      icon: LayoutGrid,
      on: (path) => path === "/" || path.startsWith("/models"),
    },
    { to: "/invest", label: "Invest", icon: TrendingUp, on: (path) => path.startsWith("/invest") },
    {
      to: "/messages",
      label: "Inbox",
      icon: MessageSquare,
      on: (path) => path.startsWith("/messages"),
      dot: unread,
    },
    {
      to: "/account",
      label: "You",
      icon: UserRound,
      on: (path) => path.startsWith("/account"),
    },
  ];
}

function Header({ path }: { path: string }) {
  const { profile, unread } = useStudio();
  const { isPending } = useCurrentUserState();
  const items = itemsFor(unread);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="wordmark text-xs font-medium">TESLA</span>
          <span className="kicker text-xs text-muted">INNOVATION</span>
        </Link>
        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-5 md:flex">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={item.on(path) ? "page" : undefined}
                className={item.on(path) ? "inline-flex items-center gap-2 text-sm text-fg" : "inline-flex items-center gap-2 text-sm text-muted"}
              >
                {item.to === "/account" && profile?.avatar ? (
                  <img src={profile.avatar} alt="" className="size-5 rounded-full object-cover" />
                ) : null}
                {item.label}
              </Link>
            ))}
            {profile?.role === "admin" ? (
              <Link
                to="/admin"
                aria-current={path.startsWith("/admin") ? "page" : undefined}
                className={path.startsWith("/admin") ? "inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg" : "inline-flex items-center gap-1 rounded-full border border-accent/50 px-3 py-1.5 text-xs font-medium text-accent"}
              >
                Studio Desk
              </Link>
            ) : null}
          </nav>
          {isPending ? (
            <span className="h-8 w-16 animate-pulse rounded-full bg-surface" />
          ) : (
            <SignedOut>
              <Link to="/login" search={{ next: "" }} className="inline-flex min-h-11 items-center text-sm text-fg">
                Sign in
              </Link>
            </SignedOut>
          )}
        </div>
      </div>
    </header>
  );
}

function Dock({ path }: { path: string }) {
  const { profile, unread } = useStudio();
  const items = itemsFor(unread);
  return (
    <nav className="dock fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-3xl">
        {items.map((item) => {
          const Icon = item.icon;
          const on = item.on(path);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={on ? "page" : undefined}
                className="relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] active:opacity-70"
              >
                {item.dot ? (
                  <span className="absolute top-2 right-[30%] size-1.5 rounded-full bg-accent" />
                ) : null}
                {item.to === "/account" && profile?.avatar ? (
                  <img src={profile.avatar} alt="" className="size-5 rounded-full object-cover" />
                ) : (
                  <Icon className={on ? "size-5 text-fg" : "size-5 text-muted"} strokeWidth={1.75} />
                )}
                <span className={on ? "text-fg" : "text-muted"}>{item.label}</span>
              </Link>
            </li>
          );
        })}
        {profile?.role === "admin" ? (
          <li className="flex-1">
            <Link
              to="/admin"
              aria-current={path.startsWith("/admin") ? "page" : undefined}
              className="relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] active:opacity-70"
            >
              <span className={path.startsWith("/admin") ? "size-5 rounded-full bg-accent" : "size-5 rounded-full border border-accent"} />
              <span className={path.startsWith("/admin") ? "text-accent" : "text-muted"}>Desk</span>
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
