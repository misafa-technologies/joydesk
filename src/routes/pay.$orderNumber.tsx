import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, LogIn, Printer, RefreshCw, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { formatKES } from "@/lib/format";
import { checkMpesaPayment, startMpesaPayment } from "@/lib/mpesa.functions";
import { downloadReceipt, printReceipt } from "@/lib/receipt";

export const Route = createFileRoute("/pay/$orderNumber")({
  head: ({ params }) => ({
    meta: [
      { title: `Complete payment for ${params.orderNumber} — JoyDesk` },
      { name: "description", content: "Complete your JoyDesk order payment securely via M-Pesa." },
      { property: "og:title", content: `Complete payment — ${params.orderNumber}` },
      { property: "og:description", content: "Complete your JoyDesk order payment securely via M-Pesa." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayPage,
});

const PHONE_RE = /^254(7|1)\d{8}$/;

function normalizePhone(input: string): string | null {
  const digits = (input || "").replace(/[^\d]/g, "");
  if (PHONE_RE.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function PayPage() {
  const { orderNumber } = Route.useParams();
  const { user, loading: authLoading } = useAuth();

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-16 text-center">
          <h1 className="text-2xl font-bold">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with the account used to place order <strong className="text-foreground">{orderNumber}</strong> to complete payment.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ redirect: `/pay/${orderNumber}` }}>
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (authLoading) {
    return (
      <Shell>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </Shell>
    );
  }

  return <PayContent orderNumber={orderNumber} />;
}

function PayContent({ orderNumber }: { orderNumber: string }) {
  const qc = useQueryClient();
  const start = useServerFn(startMpesaPayment);
  const check = useServerFn(checkMpesaPayment);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pay-order", orderNumber],
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;
      const [{ data: items }, { data: settings }, { data: payment }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", order.id),
        supabase.from("store_settings").select("*").limit(1).maybeSingle(),
        supabase
          .from("payments")
          .select("status, checkout_request_id, mpesa_receipt, result_desc")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return { order, items: items ?? [], settings, payment };
    },
  });

  useEffect(() => {
    if (data?.order?.customer_phone && !phone) {
      const normalized = normalizePhone(data.order.customer_phone);
      if (normalized) setPhone(data.order.customer_phone);
    }
  }, [data, phone]);

  useEffect(() => {
    if (data?.payment?.checkout_request_id && data.payment.status === "pending") {
      setCheckoutRequestId(data.payment.checkout_request_id);
    }
  }, [data]);

  const { data: status } = useQuery({
    queryKey: ["pay-status", checkoutRequestId],
    enabled: !!checkoutRequestId,
    refetchInterval: (query) => {
      const s = query.state.data as { status?: string } | undefined;
      return !s || s.status === "pending" ? 4000 : false;
    },
    queryFn: async () => {
      const res = (await check({ data: { checkoutRequestId: checkoutRequestId! } })) as {
        status: "pending" | "success" | "failed";
        message: string;
        receipt?: string | null;
      };
      if (res.status === "success") qc.invalidateQueries({ queryKey: ["pay-order", orderNumber] });
      return res;
    },
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </Shell>
    );
  }

  if (!data?.order) {
    return (
      <Shell>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-bold">Order not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">Check the order number and try again.</p>
        </div>
      </Shell>
    );
  }

  const { order, items, settings } = data;
  const brand = {
    storeName: settings?.store_name,
    tagline: settings?.tagline,
    supportPhone: settings?.support_phone,
    supportEmail: settings?.support_email,
    paybill: settings?.mpesa_paybill ?? "400200",
    receipt: status?.status === "success" ? status.receipt : data.payment?.mpesa_receipt,
  };
  const isPaid = order.payment_status === "paid";

  async function sendPrompt() {
    const normalized = normalizePhone(phone);
    if (!normalized) return toast.error("Enter a valid Kenyan phone number (07… or 01…)");
    setSending(true);
    try {
      const res = (await start({ data: { orderId: order.id, phone: normalized } })) as {
        checkoutRequestId: string;
        customerMessage: string;
      };
      toast.success("STK push sent", { description: res.customerMessage });
      setCheckoutRequestId(res.checkoutRequestId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the M-Pesa prompt");
    } finally {
      setSending(false);
    }
  }

  if (isPaid) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
          <h1 className="mt-4 text-2xl font-bold">Payment received</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Order <strong className="text-foreground">{order.order_number}</strong> is fully paid. Thank you!
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => printReceipt(order, items, brand)}>
              <Printer className="h-4 w-4" /> Print receipt
            </Button>
            <Button variant="outline" onClick={() => downloadReceipt(order, items, brand)}>
              <Download className="h-4 w-4" /> Download receipt
            </Button>
            <Button asChild variant="outline">
              <Link to="/track" search={{ order: order.order_number }}>
                <Truck className="h-4 w-4" /> Track order
              </Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const state = checkoutRequestId ? (status?.status ?? "pending") : "idle";

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Complete your payment</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order <strong className="text-foreground">{order.order_number}</strong> · Total{" "}
          <strong className="text-foreground">{formatKES(order.total)}</strong>
        </p>

        <div className="mt-6 rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order summary</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between py-2">
                <span>
                  {i.quantity} × {i.product_name}
                </span>
                <span className="font-medium">{formatKES(Number(i.unit_price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total</span>
            <span>{formatKES(order.total)}</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pay with M-Pesa</h2>

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
              <Button onClick={sendPrompt} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Retry M-Pesa payment
              </Button>
            </div>
          ) : state === "pending" ? (
            <div className="mt-3 flex items-start gap-2 text-sm">
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
              <div>
                <p className="font-semibold text-foreground">Waiting for confirmation…</p>
                <p className="text-muted-foreground">Enter your M-Pesa PIN on {phone}. This page updates automatically.</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium">Phone number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button onClick={sendPrompt} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send M-Pesa prompt
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Or pay manually</h2>
          <ol className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>1. Go to M-Pesa → Lipa na M-Pesa → Pay Bill</li>
            <li>
              2. Business number: <strong className="text-foreground">{settings?.mpesa_paybill ?? "400200"}</strong>
            </li>
            <li>
              3. Account number: <strong className="text-foreground">{order.order_number}</strong>
            </li>
            <li>
              4. Amount: <strong className="text-foreground">{formatKES(order.total)}</strong>
            </li>
            <li>5. Enter your PIN and confirm</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <Link to="/track" search={{ order: order.order_number }} className="text-sm font-semibold text-primary hover:underline">
            Track this order instead
          </Link>
        </div>
      </div>
    </Shell>
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
