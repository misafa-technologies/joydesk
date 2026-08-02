import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only: validate a Paybill payment made outside STK push by matching the
 * business (short code) + account number, then confirming with Daraja when a
 * checkout request exists, or recording the M-Pesa code the customer supplied.
 */
export const verifyManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { businessNumber: string; accountNumber: string; mpesaCode?: string; amount?: number }) => {
    if (!input?.businessNumber?.trim()) throw new Error("Business (Paybill/Till) number is required");
    if (!input?.accountNumber?.trim()) throw new Error("Account number is required");
    return {
      businessNumber: input.businessNumber.trim(),
      accountNumber: input.accountNumber.trim().toUpperCase(),
      mpesaCode: input.mpesaCode?.trim().toUpperCase() || "",
      amount: input.amount,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isAdmin && !isStaff) throw new Error("Forbidden");

    const { loadMpesaConfig, stkQuery, applyPaymentResult } = await import("@/lib/mpesa.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cfg = await loadMpesaConfig();
    const expected = [cfg.short_code, cfg.party_b].filter(Boolean).map(String);
    if (!expected.includes(data.businessNumber)) {
      throw new Error(`Business number ${data.businessNumber} does not match the configured M-Pesa short code.`);
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, payment_status, user_id")
      .eq("order_number", data.accountNumber)
      .maybeSingle();
    if (!order) throw new Error(`No order found for account number ${data.accountNumber}.`);
    if (order.payment_status === "paid") {
      return { status: "already_paid" as const, message: "This order is already marked as paid.", orderId: order.id };
    }

    if (data.amount !== undefined && Math.round(data.amount) < Math.round(Number(order.total))) {
      throw new Error(
        `Amount received (${data.amount}) is less than the order total (${order.total}). Ask the customer to top up.`,
      );
    }

    // 1. Prefer an authoritative Daraja confirmation when an STK request exists.
    const { data: pending } = await supabaseAdmin
      .from("payments")
      .select("id, checkout_request_id, status")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending?.checkout_request_id) {
      try {
        const result = await stkQuery(cfg, pending.checkout_request_id);
        const code = String(result["ResultCode"] ?? "");
        if (code === "0") {
          const applied = await applyPaymentResult({
            checkoutRequestId: pending.checkout_request_id,
            resultCode: "0",
            resultDesc: result["ResultDesc"] ?? "Confirmed by admin lookup",
            receipt: data.mpesaCode || null,
            raw: result,
          });
          await supabaseAdmin
            .from("payments")
            .update({
              verified_by: userId,
              verified_at: new Date().toISOString(),
              verification_note: `Verified via Daraja lookup by staff (Paybill ${data.businessNumber}, Acc ${data.accountNumber})`,
            })
            .eq("id", pending.id);
          if (applied.orderId && !applied.alreadyHandled) {
            const { notifyOrderEvent } = await import("@/lib/notifications.server");
            await notifyOrderEvent(applied.orderId, "payment_received");
          }
          return { status: "verified" as const, message: "Daraja confirmed this payment. Order marked paid.", orderId: order.id };
        }
      } catch (err) {
        console.error("[mpesa] manual verify query failed:", err instanceof Error ? err.message : err);
      }
    }

    // 2. Fall back to recording the M-Pesa confirmation code supplied by the customer.
    if (!data.mpesaCode) {
      return {
        status: "unconfirmed" as const,
        message:
          "Daraja has no completed STK request for this account number. Enter the customer's M-Pesa confirmation code to record the payment.",
        orderId: order.id,
      };
    }

    const { data: duplicate } = await supabaseAdmin
      .from("payments")
      .select("id, order_id")
      .eq("mpesa_receipt", data.mpesaCode)
      .maybeSingle();
    if (duplicate && duplicate.order_id !== order.id) {
      throw new Error(`M-Pesa code ${data.mpesaCode} is already recorded on another order.`);
    }

    const payload = {
      status: "success",
      provider: "mpesa",
      mpesa_receipt: data.mpesaCode,
      result_code: "0",
      result_desc: "Manually verified Paybill payment",
      amount: Number(order.total),
      verified_by: userId,
      verified_at: new Date().toISOString(),
      verification_note: `Manual Paybill verification (Business ${data.businessNumber}, Account ${data.accountNumber}) by staff`,
    };

    if (pending) {
      await supabaseAdmin.from("payments").update(payload).eq("id", pending.id);
    } else {
      await supabaseAdmin.from("payments").insert({ ...payload, order_id: order.id, user_id: order.user_id });
    }

    await supabaseAdmin.from("orders").update({ payment_status: "paid", status: "confirmed" }).eq("id", order.id);

    const { notifyOrderEvent } = await import("@/lib/notifications.server");
    await notifyOrderEvent(order.id, "payment_received");

    return {
      status: "recorded" as const,
      message: `Payment ${data.mpesaCode} recorded. Order ${order.order_number} is now paid.`,
      orderId: order.id,
    };
  });
