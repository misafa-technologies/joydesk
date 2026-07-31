import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const startMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; phone: string }) => {
    if (!input?.orderId) throw new Error("orderId is required");
    if (!/^254(7|1)\d{8}$/.test(input.phone || "")) throw new Error("Enter a valid Kenyan phone number");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, total, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.user_id !== userId) throw new Error("Order not found");

    const { loadMpesaConfig, stkPush } = await import("@/lib/mpesa.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = await loadMpesaConfig();

    const push = await stkPush({
      cfg,
      phone: data.phone,
      amount: Number(order.total),
      accountReference: cfg.account_reference || order.order_number,
      description: `${order.order_number} payment`,
    });

    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      user_id: userId,
      provider: "mpesa",
      amount: Number(order.total),
      phone: data.phone,
      status: "pending",
      merchant_request_id: push.MerchantRequestID,
      checkout_request_id: push.CheckoutRequestID,
    });

    return {
      checkoutRequestId: push.CheckoutRequestID,
      customerMessage: push.CustomerMessage ?? "Check your phone to enter your M-Pesa PIN.",
    };
  });

export const checkMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { checkoutRequestId: string }) => {
    if (!input?.checkoutRequestId) throw new Error("checkoutRequestId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // 1. Callback may already have settled it (fast path, RLS-scoped to the buyer).
    const { data: payment } = await supabase
      .from("payments")
      .select("status, result_desc, mpesa_receipt, order_id")
      .eq("checkout_request_id", data.checkoutRequestId)
      .maybeSingle();

    if (payment && payment.status !== "pending") {
      return {
        status: payment.status as "success" | "failed",
        message: payment.result_desc ?? "",
        receipt: payment.mpesa_receipt,
      };
    }

    // 2. Otherwise ask Daraja directly so a lost callback can't strand the order.
    const { loadMpesaConfig, stkQuery, applyPaymentResult } = await import("@/lib/mpesa.server");
    try {
      const cfg = await loadMpesaConfig();
      const result = await stkQuery(cfg, data.checkoutRequestId);
      const code = result["ResultCode"];
      if (code === undefined || code === null) return { status: "pending" as const, message: "Waiting for M-Pesa…" };
      // 1032 = cancelled by user, 1037 = timeout, 1 = insufficient funds
      if (String(code) === "0" || ["1", "1032", "1037", "2001"].includes(String(code))) {
        const applied = await applyPaymentResult({
          checkoutRequestId: data.checkoutRequestId,
          resultCode: String(code),
          resultDesc: result["ResultDesc"] ?? "",
          raw: result,
        });
        if (applied.success && applied.orderId && !applied.alreadyHandled) {
          const { notifyOrderEvent } = await import("@/lib/notifications.server");
          await notifyOrderEvent(applied.orderId, "payment_received");
        }
        return {
          status: (String(code) === "0" ? "success" : "failed") as "success" | "failed",
          message: result["ResultDesc"] ?? "",
          receipt: null as string | null,
        };
      }
      return { status: "pending" as const, message: result["ResultDesc"] ?? "Waiting for M-Pesa…" };
    } catch (err) {
      // Daraja throttles queries — keep polling instead of failing the order.
      console.error("[mpesa] query failed:", err instanceof Error ? err.message : err);
      return { status: "pending" as const, message: "Waiting for M-Pesa…" };
    }
  });
