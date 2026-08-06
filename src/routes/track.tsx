import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PackageCheck, Truck, Home, Clock, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatDateTime, formatKES } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track your order — JoyDesk" },
      { name: "description", content: "Enter your JoyDesk order number to see live delivery progress anywhere in Kenya." },
      { property: "og:title", content: "Track your order — JoyDesk" },
      { property: "og:description", content: "Live delivery progress for your JoyDesk order." },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  component: TrackPage,
});

const STEPS = [
  { key: "pending", label: "Order placed", icon: Clock },
  { key: "processing", label: "Processing", icon: PackageCheck },
  { key: "shipped", label: "Out for delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

function TrackPage() {
  const { order: initial } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState(initial ?? "");
  const orderNumber = initial ?? "";

  const { data, isFetching } = useQuery({
    queryKey: ["track", orderNumber],
    enabled: !!orderNumber && !!user,
    queryFn: async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (!order) return null;
      const { data: shipment } = await supabase
        .from("shipments")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();
      return { order, shipment };
    },
  });

  const currentIndex = data ? Math.max(0, STEPS.findIndex((s) => s.key === (data.shipment?.status ?? data.order.status))) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight">Track your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the order number from your confirmation email or receipt.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/track", search: { order: input.trim().toUpperCase() } });
          }}
          className="mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. JD-XXXXXX"
            maxLength={40}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
          />
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Search className="h-4 w-4" /> Track
          </button>
        </form>

        {!user && (
          <p className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <Link to="/auth" search={{ redirect: "/track" }} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>{" "}
            with the account used to place the order to see its status.
          </p>
        )}

        {orderNumber && user && isFetching && <div className="mt-8 h-40 animate-pulse rounded-xl bg-muted" />}

        {orderNumber && user && !isFetching && !data && (
          <p className="mt-8 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            No order found with number <strong>{orderNumber}</strong> on your account.
          </p>
        )}

        {data && (
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-border p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{data.order.order_number}</div>
                  <div className="text-xs text-muted-foreground">Placed {formatDateTime(data.order.created_at)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{formatKES(data.order.total)}</div>
                  <div className="text-xs capitalize text-muted-foreground">Payment: {data.order.payment_status}</div>
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                {STEPS.map((s, i) => {
                  const done = i <= currentIndex;
                  const Icon = s.icon;
                  return (
                    <li key={s.key} className="flex items-center gap-3">
                      <span
                        className={`grid h-9 w-9 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-xl border border-border p-5 text-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shipment</h2>
              <div className="mt-3 space-y-1 text-muted-foreground">
                <p>Tracking number: <span className="font-medium text-foreground">{data.shipment?.tracking_number ?? "Assigned once dispatched"}</span></p>
                <p>Courier: <span className="font-medium text-foreground">{data.shipment?.courier ?? "Pending assignment"}</span></p>
                <p>Courier contact: <span className="font-medium text-foreground">{data.shipment?.courier_contact ?? "—"}</span></p>
                <p>Current location: <span className="font-medium text-foreground">{data.shipment?.current_location ?? "Warehouse, Nairobi"}</span></p>
                <p>
                  Destination:{" "}
                  <span className="font-medium text-foreground">
                    {data.order.county
                      ? `${data.order.street ?? ""}, ${data.order.town ?? ""}, ${data.order.sub_county ?? ""}, ${data.order.county}`
                      : "Store pickup"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
