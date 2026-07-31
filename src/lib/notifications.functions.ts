import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(context: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Forbidden");
}

/** Fires the order confirmation email/SMS right after checkout. */
export const notifyOrderPlaced = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string }) => {
    if (!input?.orderId) throw new Error("orderId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, user_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== context.userId) throw new Error("Order not found");
    const { notifyOrderEvent } = await import("@/lib/notifications.server");
    await notifyOrderEvent(data.orderId, "order_confirmation");
    await notifyOrderEvent(data.orderId, "admin_new_order");
    return { ok: true };
  });

/** Staff-triggered shipping status notification. */
export const notifyShippingUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orderId: string; status: string; courier?: string; trackingNumber?: string; message?: string }) => {
    if (!input?.orderId) throw new Error("orderId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { notifyOrderEvent } = await import("@/lib/notifications.server");
    await notifyOrderEvent(data.orderId, "shipping_update", {
      status: data.status,
      courier: data.courier ?? null,
      trackingNumber: data.trackingNumber ?? null,
      message: data.message,
    });
    return { ok: true };
  });

/** Admin "send test" for the email + SMS configuration. */
export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channel: "email" | "sms"; to: string }) => {
    if (!input?.to) throw new Error("A recipient is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context as never);
    const { sendEmail, sendSms } = await import("@/lib/notifications.server");
    if (data.channel === "sms") {
      return await sendSms({ to: data.to, message: "JoyDesk test SMS — your Africa's Talking setup works." });
    }
    const { renderTemplate } = await import("@/lib/email-templates");
    const { subject, html } = renderTemplate("custom", {
      orderNumber: "TEST",
      customerName: "Admin",
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      total: 0,
      siteUrl: "https://joydesk.lovable.app",
      subjectOverride: "JoyDesk email test",
      message: "If you can read this, your email configuration is working correctly.",
    });
    return await sendEmail({ to: data.to, subject, html, template: "test" });
  });
