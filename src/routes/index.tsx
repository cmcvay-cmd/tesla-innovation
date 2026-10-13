import { createFileRoute, Link } from "@tanstack/react-router";
import { Skeleton, Specs, StatusPill, ghostBtn, primaryBtn } from "@/components/bits";
import { LivePrice } from "@/components/live-price";
import { useLoad } from "@/components/use-load";
import { listVehicles } from "@/lib/studio";

export const Route = createFileRoute("/")({ component: ShopPage });

function ShopPage() {
  const { data, error, pending } = useLoad(listVehicles, "lineup", 20000);

  return (
    <div>
      <p className="kicker text-xs text-muted">THE LINEUP</p>
      <h1 className="mt-2 text-4xl font-medium tracking-tight">Shop the cars</h1>
      <p className="mt-3 max-w-xl text-muted">
        Shop a car with cash or finance, or invest now and see what each amount returns.
      </p>
      {pending ? <Skeleton /> : null}
      {error ? <p className="mt-6 text-sm text-accent">{error}</p> : null}
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {data?.map((vehicle) => (
          <li key={vehicle.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <Link
              to="/models/$modelId"
              params={{ modelId: vehicle.id }}
              search={{ intent: "" }}
              className="block"
            >
              <img src={vehicle.image} alt="" className="aspect-video w-full object-cover" />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">{vehicle.kind}</p>
                    <h2 className="text-xl font-medium">{vehicle.name}</h2>
                  </div>
                  <StatusPill status={vehicle.status} />
                </div>
                <p className="text-sm text-muted">{vehicle.tagline}</p>
                <Specs vehicle={vehicle} />
                <LivePrice anchorCents={vehicle.anchorCents} mode={vehicle.quoteMode} />
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <Link
                to="/models/$modelId"
                params={{ modelId: vehicle.id }}
                search={{ intent: "shop" }}
                className={primaryBtn + " w-full"}
              >
                Shop
              </Link>
              <Link
                to="/models/$modelId"
                params={{ modelId: vehicle.id }}
                search={{ intent: "invest" }}
                className={ghostBtn + " w-full"}
              >
                Invest now
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
