import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Avatar, Guard, Note, Skeleton, StatusPill } from "@/components/bits";
import { useStudio } from "@/components/shell";
import { useLoad } from "@/components/use-load";
import { readAvatar } from "@/lib/avatar";
import { UserButton } from "@/lib/auth/gates";
import { markedCents, usd, whenLabel } from "@/lib/money";
import { myBook, setAvatar } from "@/lib/studio";

export const Route = createFileRoute("/account")({
  component: () => (
    <Guard>
      <AccountPage />
    </Guard>
  ),
});

function AccountPage() {
  const { profile, profileReady, refreshProfile } = useStudio();
  const book = useLoad(myBook, "account-book");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const dataUrl = await readAvatar(file);
      await setAvatar({ data: dataUrl });
      refreshProfile();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not save the photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer">
          <Avatar src={profile?.avatar} name={profile?.name || "You"} className="size-20 text-lg" />
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void onPhoto(event.target.files?.[0])}
          />
        </label>
        <div>
          <p className="kicker text-xs text-muted">ACCOUNT</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">{profile?.name || "Your studio"}</h1>
          <p className="mt-1 text-sm text-muted">{profile?.email}</p>
          <p className="mt-1 text-sm text-muted">{profile?.role === "admin" ? "Elon Musk" : "Member"}</p>
        </div>
      </div>
      <p className="text-sm text-muted">{photoBusy ? "Saving photo…" : "Tap the photo to upload a new one."}</p>
      {photoError ? <Note>{photoError}</Note> : null}

      {!profileReady ? <Skeleton /> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Vehicle orders</h2>
        {book.data && book.data.reservations.length === 0 ? (
          <p className="text-sm text-muted">No orders yet.</p>
        ) : null}
        <ul className="space-y-3">
          {book.data?.reservations.map((row) => (
            <li key={row.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.modelName}</h3>
                  <p className="text-sm text-muted">
                    {row.color} · {row.payMethod === "finance" ? `Finance ${row.termMonths ?? ""} mo` : "Cash"}
                  </p>
                  <p className="text-xs text-muted">{whenLabel(row.createdAt)}</p>
                </div>
                <StatusPill status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Model investments</h2>
        {book.data && book.data.stakes.length === 0 ? (
          <p className="text-sm text-muted">None yet. Open a car and choose Invest now.</p>
        ) : null}
        <ul className="space-y-3">
          {book.data?.stakes.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <div>
                <h3 className="font-medium">{row.modelName}</h3>
                <p className="text-sm tabular-nums text-muted">
                  {usd(row.amountCents)} · {row.horizonMonths} mo · {(row.aprBps / 100).toFixed(1)}%
                </p>
              </div>
              <StatusPill status={row.status} />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Allocations</h2>
        {book.data && book.data.investments.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing committed. <Link to="/invest" className="text-fg underline-offset-4 hover:underline">See the plans</Link>.
          </p>
        ) : null}
        <ul className="space-y-3">
          {book.data?.investments.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4">
              <div>
                <h3 className="font-medium">{row.planName}</h3>
                <p className="text-sm tabular-nums text-muted">
                  {usd(row.status === "active" ? markedCents(row.amountCents, row.aprBps, row.openedAt) : row.amountCents)}
                </p>
              </div>
              <StatusPill status={row.status} />
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-line pt-4">
        <UserButton />
      </div>
    </div>
  );
}
