import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Download, MessageCircle, Truck, Loader2, XCircle, RefreshCw, Printer, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatKES, formatDateTime } from "@/lib/format";
import { checkMpesaPayment, startMpesaPayment } from "@/lib/mpesa.functions";
import { downloadReceipt as downloadReceiptFile, previewReceipt } from "@/lib/receipt";
import { paymentLink, trackingLink } from "@/lib/site";
import { MediaImage } from "@/components/site/MediaImage";

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
      const [{ data: items }, { data: payment }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", order.id),
        supabase
          .from("payments")
          .select("mpesa_receipt, status")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return { order, items: items ?? [], payment };
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

  const { order, items, payment } = data;
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
      `Payment: M-Pesa Paybill ${paybill} (Acc: ${order.order_number})`,
      order.payment_status !== "paid" ? `Pay online: ${paymentLink(order.order_number)}` : "",
      order.county ? `Deliver to: ${order.street}, ${order.town}, ${order.sub_county}, ${order.county}` : "Store pickup",
      "",
      "Here is my payment confirmation / follow-up.",
    ]
      .filter(Boolean)
      .join("\n"),
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
      payment_link: paymentLink(order.order_number),
      track_link: trackingLink(order.order_number),
    },
    null,
    2,
  );

  const receiptBrand = {
    storeName: settings?.store_name,
    tagline: settings?.tagline,
    supportPhone: settings?.support_phone,
    supportEmail: settings?.support_email,
    paybill,
    receipt: payment?.mpesa_receipt,
  };
  const isPaid = order.payment_status === "paid";
  const isFailed = order.payment_status === "failed";

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
                  {i.product_image && <MediaImage src={i.product_image} alt={i.product_name} className="h-full w-full object-cover" />}
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
            <MpesaStatus
              orderId={order.id}
              orderNumber={order.order_number}
              phone={order.customer_phone}
              paid={order.payment_status === "paid"}
            />
          )}
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

          {isPaid ? (
            <>
              <button
                onClick={() => previewReceipt(order, items, receiptBrand)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <Printer className="h-4 w-4" /> Preview & print receipt
              </button>
              <button
                onClick={() => downloadReceiptFile(order, items, receiptBrand)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <Download className="h-4 w-4" /> Download receipt
              </button>
            </>
          ) : (
            <button
              onClick={() => downloadReceiptFile(order, items, receiptBrand)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Download invoice
            </button>
          )}

          {isFailed && (
            <Link
              to="/pay/$orderNumber"
              params={{ orderNumber: order.order_number }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <CreditCard className="h-4 w-4" /> Complete payment
            </Link>
          )}

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

function MpesaStatus({
  orderId,
  orderNumber,
  phone,
  paid,
}: {
  orderId: string;
  orderNumber: string;
  phone: string;
  paid: boolean;
}) {
  const qc = useQueryClient();
  const check = useServerFn(checkMpesaPayment);
  const start = useServerFn(startMpesaPayment);
  const [retrying, setRetrying] = useState(false);

  const { data: status } = useQuery({
    queryKey: ["mpesa-status", orderId],
    enabled: !paid,
    refetchInterval: (query) => {
      const s = query.state.data as { status?: string } | undefined;
      return !s || s.status === "pending" ? 4000 : false;
    },
    queryFn: async () => {
      const { data: payment } = await supabase
        .from("payments")
        .select("status, checkout_request_id, mpesa_receipt, result_desc")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payment) return { status: "none" as const, message: "", receipt: null as string | null };
      if (payment.status !== "pending") {
        if (payment.status === "success") qc.invalidateQueries({ queryKey: ["order", orderNumber] });
        return {
          status: payment.status as "success" | "failed",
          message: payment.result_desc ?? "",
          receipt: payment.mpesa_receipt,
        };
      }
      if (!payment.checkout_request_id) return { status: "pending" as const, message: "", receipt: null };

      const res = (await check({ data: { checkoutRequestId: payment.checkout_request_id } })) as {
        status: "pending" | "success" | "failed";
        message: string;
        receipt?: string | null;
      };
      if (res.status === "success") qc.invalidateQueries({ queryKey: ["order", orderNumber] });
      return { status: res.status, message: res.message, receipt: res.receipt ?? null };
    },
  });

  async function retry() {
    setRetrying(true);
    try {
      const res = (await start({ data: { orderId, phone } })) as { customerMessage: string };
      toast.success("STK push sent", { description: res.customerMessage });
      qc.invalidateQueries({ queryKey: ["mpesa-status", orderId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the M-Pesa prompt");
    } finally {
      setRetrying(false);
    }
  }

  const state = paid ? "success" : (status?.status ?? "pending");

  return (
    <div className="rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment status</h2>
      {state === "success" ? (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">Payment received</p>
            {status?.receipt && <p className="text-muted-foreground">M-Pesa receipt: {status.receipt}</p>}
          </div>
        </div>
      ) : state === "failed" ? (
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Payment not completed</p>
              <p className="text-muted-foreground">{status?.message || "The M-Pesa request was cancelled or timed out."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={retry}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Retry M-Pesa payment
            </button>
            <Link
              to="/pay/$orderNumber"
              params={{ orderNumber }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Complete payment
            </Link>
          </div>
        </div>
      ) : state === "none" ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-muted-foreground">No M-Pesa request sent yet. Send an STK push to {phone}.</p>
          <button
            onClick={retry}
            disabled={retrying}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Pay with M-Pesa
          </button>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
          <div>
            <p className="font-semibold text-foreground">Waiting for confirmation…</p>
            <p className="text-muted-foreground">Enter your M-Pesa PIN on {phone}. This page updates automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}
