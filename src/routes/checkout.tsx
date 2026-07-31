import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { formatKES, normalizeKenyanPhone } from "@/lib/format";
import { COUNTY_NAMES, getSubCounties, getTowns } from "@/data/kenya-locations";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — JoyDesk" },
      { name: "description", content: "Choose delivery across all Kenyan counties, apply a coupon and pay by M-Pesa Paybill or on delivery." },
      { property: "og:title", content: "Checkout — JoyDesk" },
      { property: "og:description", content: "Nationwide delivery, coupons and M-Pesa payment." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

type Delivery = "standard" | "express" | "pickup";

function Checkout() {
  const cart = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [town, setTown] = useState("");
  const [street, setStreet] = useState("");
  const [notes, setNotes] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("standard");
  const [payment, setPayment] = useState<"mpesa" | "cod">("mpesa");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const standardFee = Number(settings?.standard_delivery_fee ?? 500);
  const expressFee = Number(settings?.express_delivery_fee ?? 1200);
  const threshold = Number(settings?.free_delivery_threshold ?? 15000);

  const deliveryFee = useMemo(() => {
    if (delivery === "pickup") return 0;
    const base = delivery === "express" ? expressFee : standardFee;
    if (delivery === "standard" && cart.subtotal >= threshold) return 0;
    return base;
  }, [delivery, cart.subtotal, standardFee, expressFee, threshold]);

  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, cart.subtotal - discount) + deliveryFee;

  async function applyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) return toast.error("Coupon not found or inactive");
    if (data.expires_at && new Date(data.expires_at) < new Date()) return toast.error("Coupon has expired");
    if (data.max_uses && data.used_count >= data.max_uses) return toast.error("Coupon usage limit reached");
    if (cart.subtotal < Number(data.min_order_total)) {
      return toast.error(`Spend at least ${formatKES(data.min_order_total)} to use this coupon`);
    }
    const value =
      data.discount_type === "percent"
        ? Math.round((cart.subtotal * Number(data.discount_value)) / 100)
        : Number(data.discount_value);
    setCoupon({ code, discount: Math.min(value, cart.subtotal) });
    toast.success(`Coupon applied — ${formatKES(value)} off`);
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return navigate({ to: "/auth", search: { redirect: "/checkout" } });
    if (cart.items.length === 0) return toast.error("Your cart is empty");
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) return toast.error("Enter a valid Kenyan phone number");
    if (delivery !== "pickup" && (!county || !subCounty || !town || !street.trim())) {
      return toast.error("Complete your delivery location");
    }

    setBusy(true);
    try {
      const orderNumber = `JD-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          customer_name: name.trim(),
          customer_email: email.trim() || user.email,
          customer_phone: normalized,
          status: "pending",
          payment_method: payment,
          payment_status: "pending",
          delivery_method: delivery,
          delivery_fee: deliveryFee,
          subtotal: cart.subtotal,
          discount,
          total,
          coupon_code: coupon?.code ?? null,
          county: delivery === "pickup" ? null : county,
          sub_county: delivery === "pickup" ? null : subCounty,
          town: delivery === "pickup" ? null : town,
          street: delivery === "pickup" ? null : street.trim(),
          notes: notes.trim() || null,
        })
        .select("id, order_number")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("order_items").insert(
        cart.items.map((i) => ({
          order_id: order.id,
          product_id: i.id,
          product_name: i.name,
          product_image: i.image,
          unit_price: i.price,
          quantity: i.quantity,
        })),
      );
      if (itemsError) throw itemsError;

      // Fire the order confirmation email/SMS (never block checkout on it).
      notifyOrder({ data: { orderId: order.id } }).catch(() => undefined);

      if (payment === "mpesa") {
        try {
          const res = (await startPayment({ data: { orderId: order.id, phone: normalized } })) as {
            customerMessage: string;
          };
          toast.success("M-Pesa request sent", { description: res.customerMessage });
        } catch (err) {
          toast.warning("Order placed, but the M-Pesa prompt failed", {
            description: err instanceof Error ? err.message : "You can retry payment on the next page.",
          });
        }
      }

      cart.clear();
      navigate({ to: "/order-success/$orderNumber", params: { orderNumber: order.order_number } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  if (!loading && !user) {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-2xl font-bold">Sign in to check out</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an account so we can track and deliver your order.
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/checkout" }}
            className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Sign in / Register
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Section title="Contact details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={name} onChange={setName} required />
              <Input label="Phone (M-Pesa)" value={phone} onChange={setPhone} placeholder="07XX XXX XXX" required />
              <Input label="Email" type="email" value={email} onChange={setEmail} placeholder={user?.email ?? ""} />
            </div>
          </Section>

          <Section title="Delivery method">
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                { key: "standard", label: "Standard", desc: `2–4 days · ${cart.subtotal >= threshold ? "Free" : formatKES(standardFee)}` },
                { key: "express", label: "Express", desc: `Next day · ${formatKES(expressFee)}` },
                { key: "pickup", label: "Pickup", desc: "Nairobi store · Free" },
              ] as const).map((o) => (
                <button
                  type="button"
                  key={o.key}
                  onClick={() => setDelivery(o.key)}
                  className={`rounded-lg border p-4 text-left ${delivery === o.key ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="text-sm font-semibold">{o.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{o.desc}</div>
                </button>
              ))}
            </div>
          </Section>

          {delivery !== "pickup" && (
            <Section title="Shipping address">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="County"
                  value={county}
                  onChange={(v) => {
                    setCounty(v);
                    setSubCounty("");
                    setTown("");
                  }}
                  options={COUNTY_NAMES}
                  placeholder="Select county"
                />
                <Select
                  label="Sub-county"
                  value={subCounty}
                  onChange={(v) => {
                    setSubCounty(v);
                    setTown("");
                  }}
                  options={getSubCounties(county).map((s) => s.name)}
                  placeholder={county ? "Select sub-county" : "Select county first"}
                />
                <Select
                  label="Town / Ward"
                  value={town}
                  onChange={setTown}
                  options={getTowns(county, subCounty)}
                  placeholder={subCounty ? "Select town" : "Select sub-county first"}
                />
                <Input label="Street / Estate / House" value={street} onChange={setStreet} required />
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-medium">Delivery notes (optional)</span>
                <textarea
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                />
              </label>
            </Section>
          )}

          <Section title="Payment">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPayment("mpesa")}
                className={`rounded-lg border p-4 text-left ${payment === "mpesa" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="text-sm font-semibold">M-Pesa Paybill</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Paybill {settings?.mpesa_paybill ?? "—"} · Account {settings?.mpesa_account_name ?? "JoyDesk"}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPayment("cod")}
                className={`rounded-lg border p-4 text-left ${payment === "cod" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <div className="text-sm font-semibold">Pay on delivery</div>
                <div className="mt-1 text-xs text-muted-foreground">Cash or M-Pesa when your order arrives</div>
              </button>
            </div>
          </Section>
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order summary</h2>
          <ul className="space-y-2 text-sm">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="line-clamp-1 text-muted-foreground">
                  {i.quantity} × {i.name}
                </span>
                <span className="shrink-0 font-medium">{formatKES(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code"
              maxLength={40}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button type="button" onClick={applyCoupon} className="rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">
              Apply
            </button>
          </div>

          <div className="space-y-1.5 border-t border-border pt-4 text-sm">
            <Row label="Subtotal" value={formatKES(cart.subtotal)} />
            {discount > 0 && <Row label={`Discount (${coupon?.code})`} value={`−${formatKES(discount)}`} />}
            <Row label="Delivery" value={deliveryFee === 0 ? "Free" : formatKES(deliveryFee)} />
            <div className="flex justify-between pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatKES(total)}</span>
            </div>
          </div>

          <button
            disabled={busy || cart.items.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Place order
          </button>
        </aside>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
