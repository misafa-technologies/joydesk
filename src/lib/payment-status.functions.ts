import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED = ["pending", "paid", "failed", "refunded"] as const;
type PaymentStatus = (typeof ALLOWED)[number];

/**
 * Guarded payment-status change.
 *
 * Rules:
 * - Nobody can flip an order to "paid" from the dropdown — use the manual
 *   Paybill verification flow on the Payments page (it proves the money moved).
 * - Reversing a payment that M-Pesa confirmed automatically (STK callback with
 *   no human verifier) requires an admin who re-types their own account email.
 * - Manually recorded payments can be reversed by staff with a reason.
 * Every change is written to the order audit timeline.
 */
export const setOrderPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; paymentStatus: string; reason?: string; adminEmail?: string }) => {
    if (!input?.orderId) throw new Error("Order is required");
    if (!ALLOWED.includes(input.paymentStatus as PaymentStatus)) throw new Error("Unknown payment status");
    return {
      orderId: input.orderId,
      paymentStatus: input.paymentStatus as PaymentStatus,
      reason: (input.reason ?? "").trim().slice(0, 500),
      adminEmail: (input.adminEmail ?? "").trim().toLowerCase().slice(0, 200),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
    if (!isStaff) throw new Error("Forbidden");
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    if (order.payment_status === data.paymentStatus) return { status: "unchanged" as const, message: "No change." };

    if (data.paymentStatus === "paid") {
      throw new Error(
        "Orders cannot be marked paid from this dropdown. Use Payments → “Mark paid manually” so the M-Pesa payment is verified first.",
      );
    }

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, status, checkout_request_id, mpesa_receipt, verified_by")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const autoConfirmed =
      !!payment && payment.status === "success" && !!payment.checkout_request_id && !payment.verified_by;

    if (order.payment_status === "paid") {
      if (!data.reason || data.reason.length < 5) {
        throw new Error("Give a short reason (at least 5 characters) before reversing a paid order.");
      }
      if (autoConfirmed) {
        const email = String((claims as { email?: string }).email ?? "").toLowerCase();
        if (!isAdmin) {
          throw new Error("This payment was confirmed automatically by M-Pesa. Only an admin can reverse it.");
        }
        if (!email || data.adminEmail !== email) {
          throw new Error("Enter your own admin account email exactly to confirm reversing an automatic M-Pesa payment.");
        }
      }
    }

    const { error: upErr } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: data.paymentStatus })
      .eq("id", order.id);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      status: `payment:${data.paymentStatus}`,
      note: `Payment changed from ${order.payment_status} to ${data.paymentStatus}${autoConfirmed ? " (automatic M-Pesa payment)" : ""}${data.reason ? ` — ${data.reason}` : ""}`,
      actor_id: userId,
    });

    if (payment && payment.status === "success") {
      await supabaseAdmin
        .from("payments")
        .update({
          status: data.paymentStatus === "refunded" ? "refunded" : "reversed",
          verification_note: `Reversed by staff — ${data.reason}`,
          verified_by: userId,
          verified_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
    }

    return { status: "updated" as const, message: `Order ${order.order_number} payment set to ${data.paymentStatus}.` };
  });
