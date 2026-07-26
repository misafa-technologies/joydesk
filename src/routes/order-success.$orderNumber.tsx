import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, MessageCircle, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatKES, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/order-success/$orderNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderNumber} confirmed — JoyDesk` },
      { name: "description", content: "Your JoyDesk order is confirmed. Download your receipt and follow up on WhatsApp." },
      { property: "og:title", content: "Order confirmed — JoyDesk" },
      { property: "og:description", content: "Your JoyDesk order is confirmed." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderSuccess,
});

function OrderSuccess() {
  const { orderNumber } = Route.useParams();

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["order", orderNumber],
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order.id);
      return { order, items: items ?? [] };
    },
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with the account used to place this order.</p>
          <Link to="/shop" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
            Continue shopping
          </Link>
        </div>
      </Shell>
    );
  }

  const { order, items } = data;
  const paybill = settings?.mpesa_paybill ?? "400200";
  const accountName = settings?.mpesa_account_name ?? "JoyDesk";
  const whatsapp = (settings?.whatsapp_number ?? "254700000000").replace(/\D/g, "");

  const waMessage = encodeURIComponent(
    [
      `Hello ${settings?.store_name ?? "JoyDesk"}, I've just placed order ${order.order_number}.`,
      "",
      ...items.map((i) => `• ${i.quantity} × ${i.product_name} — ${formatKES(Number(i.unit_price) * i.quantity)}`),
      "",
      `Total: ${formatKES(order.total)}`,
      `Payment: ${order.payment_method === "mpesa" ? `M-Pesa Paybill ${paybill} (Acc: ${order.order_number})` : "Pay on delivery"}`,
      order.county ? `Deliver to: ${order.street}, ${order.town}, ${order.sub_county}, ${order.county}` : "Store pickup",
      "",
      "Here is my payment confirmation / follow-up.",
    ].join("\n"),
  );

  const mpesaJson = JSON.stringify(
    {
      paybill,
      account_number: order.order_number,
      account_name: accountName,
      amount: Number(order.total),
      currency: "KES",
      reference: order.order_number,
      whatsapp_followup: `https://wa.me/${whatsapp}`,
    },
    null,
    2,
  );

  function downloadReceipt() {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${order.order_number}</title>
<style>body{font-family:ui-sans-serif,system-ui,Arial;padding:32px;color:#111}h1{color:#0F4C81;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #eee;padding:8px;text-align:left;font-size:14px}tfoot td{font-weight:700;border:none}.muted{color:#666;font-size:13px}</style>
</head><body>
<h1>JoyDesk</h1><div class="muted">Comfort Meets Productivity</div>
<h2>Receipt · ${order.order_number}</h2>
<p class="muted">${formatDateTime(order.created_at)}<br/>${order.customer_name} · ${order.customer_phone}${order.customer_email ? ` · ${order.customer_email}` : ""}</p>
<p class="muted">${order.county ? `${order.street ?? ""}, ${order.town ?? ""}, ${order.sub_county ?? ""}, ${order.county}` : "Store pickup"}</p>
<table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Amount</th></tr></thead><tbody>
${items.map((i) => `<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${formatKES(i.unit_price)}</td><td>${formatKES(Number(i.unit_price) * i.quantity)}</td></tr>`).join("")}
</tbody><tfoot>
<tr><td colspan="3">Subtotal</td><td>${formatKES(order.subtotal)}</td></tr>
${Number(order.discount) > 0 ? `<tr><td colspan="3">Discount</td><td>-${formatKES(order.discount)}</td></tr>` : ""}
<tr><td colspan="3">Delivery (${order.delivery_method})</td><td>${formatKES(order.delivery_fee)}</td></tr>
<tr><td colspan="3">Total</td><td>${formatKES(order.total)}</td></tr>
</tfoot></table>
<p class="muted">Payment: ${order.payment_method === "mpesa" ? `M-Pesa Paybill ${paybill}, Account ${order.order_number}` : "Pay on delivery"} · Status: ${order.payment_status}</p>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `JoyDesk-Receipt-${order.order_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="h-12 w-12 text-accent" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Order confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you, {order.customer_name}. Your order number is{" "}
          <strong className="text-foreground">{order.order_number}</strong>.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-border">
          <div className="border-b border-border p-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Items
          </div>
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 overflow-hidden rounded-md bg-muted">
                  {i.product_image && <img src={i.product_image} alt={i.product_name} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium">{i.product_name}</div>
                  <div className="text-muted-foreground">
                    {i.quantity} × {formatKES(i.unit_price)}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatKES(Number(i.unit_price) * i.quantity)}</div>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 border-t border-border p-5 text-sm">
            <SummaryRow label="Subtotal" value={formatKES(order.subtotal)} />
            {Number(order.discount) > 0 && <SummaryRow label="Discount" value={`−${formatKES(order.discount)}`} />}
            <SummaryRow label={`Delivery (${order.delivery_method})`} value={formatKES(order.delivery_fee)} />
            <div className="flex justify-between pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatKES(order.total)}</span>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {order.payment_method === "mpesa" && (
            <div className="rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pay via M-Pesa</h2>
              <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li>1. Go to M-Pesa → Lipa na M-Pesa → Pay Bill</li>
                <li>2. Business number: <strong className="text-foreground">{paybill}</strong></li>
                <li>3. Account number: <strong className="text-foreground">{order.order_number}</strong></li>
                <li>4. Amount: <strong className="text-foreground">{formatKES(order.total)}</strong></li>
                <li>5. Enter your PIN and confirm</li>
              </ol>
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-primary">View payment details (JSON)</summary>
                <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">{mpesaJson}</pre>
              </details>
            </div>
          )}

          <a
            href={`https://wa.me/${whatsapp}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> Follow up on WhatsApp
          </a>

          <button
            onClick={downloadReceipt}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Download receipt
          </button>

          <Link
            to="/track"
            search={{ order: order.order_number }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            <Truck className="h-4 w-4" /> Track this order
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 lg:px-8">{children}</main>
      <Footer />
    </div>
  );
}
