// Server-only notification dispatch: SMTP/Resend email + Africa's Talking SMS.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderTemplate, type OrderEmailData, type TemplateKey } from "@/lib/email-templates";

export interface IntegrationSettings {
  email_enabled: boolean;
  email_provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean;
  smtp_user: string | null;
  smtp_password: string | null;
  resend_api_key: string | null;
  from_name: string | null;
  from_email: string | null;
  admin_notify_email: string | null;
  sms_enabled: boolean;
  at_username: string | null;
  at_api_key: string | null;
  at_sender_id: string | null;
  at_sandbox: boolean;
  notify_order_confirmation: boolean;
  notify_payment_received: boolean;
  notify_shipping_update: boolean;
  notify_admin_new_order: boolean;
  custom_password_reset?: boolean;
}

export async function loadIntegrationSettings(): Promise<IntegrationSettings | null> {
  const { data } = await supabaseAdmin
    .from("integration_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as IntegrationSettings | null) ?? null;
}

async function log(entry: {
  channel: string;
  template?: string | null;
  recipient: string;
  subject?: string | null;
  status: string;
  error?: string | null;
  order_id?: string | null;
}) {
  try {
    await supabaseAdmin.from("notification_logs").insert(entry);
  } catch {
    /* logging must never break a send */
  }
}

async function sendViaResend(s: IntegrationSettings, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${s.resend_api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${s.from_name || "JoyDesk"} <${s.from_email}>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed [${res.status}]: ${await res.text()}`);
}

async function sendViaSmtp(s: IntegrationSettings, to: string, subject: string, html: string) {
  if (!s.smtp_host || !s.smtp_user) throw new Error("SMTP host and username are required");
  const nodemailer = (await import("nodemailer")).default;
  const port = s.smtp_port || 587;
  const host = s.smtp_host.trim();
  const isGmail = /(^|\.)gmail\.com$|(^|\.)googlemail\.com$/i.test(host);
  const transporter = nodemailer.createTransport({
    host,
    port,
    // Port 465 is implicit TLS; 587 upgrades via STARTTLS. Gmail needs this exact pairing.
    secure: port === 465 ? true : !!s.smtp_secure,
    requireTLS: port === 587,
    auth: { user: s.smtp_user, pass: (s.smtp_password || "").replace(/\s+/g, isGmail ? "" : "") },
    ...(isGmail ? { service: "gmail" as const } : {}),
  });
  await transporter.sendMail({
    from: `${s.from_name || "JoyDesk"} <${s.from_email || s.smtp_user}>`,
    to,
    subject,
    html,
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  template?: string;
  orderId?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const s = await loadIntegrationSettings();
  if (!s || !s.email_enabled) return { sent: false, reason: "email_disabled" };
  if (!params.to) return { sent: false, reason: "no_recipient" };
  try {
    if (s.email_provider === "resend") {
      if (!s.resend_api_key) throw new Error("Resend API key is not configured");
      await sendViaResend(s, params.to, params.subject, params.html);
    } else {
      await sendViaSmtp(s, params.to, params.subject, params.html);
    }
    await log({
      channel: "email",
      template: params.template ?? null,
      recipient: params.to,
      subject: params.subject,
      status: "sent",
      order_id: params.orderId ?? null,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed:", message);
    await log({
      channel: "email",
      template: params.template ?? null,
      recipient: params.to,
      subject: params.subject,
      status: "failed",
      error: message,
      order_id: params.orderId ?? null,
    });
    return { sent: false, reason: message };
  }
}

export async function sendSms(params: {
  to: string;
  message: string;
  orderId?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const s = await loadIntegrationSettings();
  if (!s || !s.sms_enabled) return { sent: false, reason: "sms_disabled" };
  if (!s.at_username || !s.at_api_key) return { sent: false, reason: "sms_not_configured" };
  const endpoint = s.at_sandbox
    ? "https://api.sandbox.africastalking.com/version1/messaging"
    : "https://api.africastalking.com/version1/messaging";
  const to = params.to.startsWith("+") ? params.to : `+${params.to}`;
  try {
    const form = new URLSearchParams({ username: s.at_username, to, message: params.message });
    if (s.at_sender_id) form.set("from", s.at_sender_id);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apiKey: s.at_api_key,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Africa's Talking failed [${res.status}]: ${text}`);
    await log({ channel: "sms", recipient: to, subject: null, status: "sent", order_id: params.orderId ?? null });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sms] send failed:", message);
    await log({
      channel: "sms",
      recipient: to,
      status: "failed",
      error: message,
      order_id: params.orderId ?? null,
    });
    return { sent: false, reason: message };
  }
}

/** Loads an order + items and fans out the configured email/SMS notifications. */
export async function notifyOrderEvent(
  orderId: string,
  key: Extract<TemplateKey, "order_confirmation" | "payment_received" | "shipping_update" | "admin_new_order">,
  extra: Partial<OrderEmailData> = {},
  siteUrl = "https://joydesk.lovable.app",
) {
  const s = await loadIntegrationSettings();
  const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return;
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_name, quantity, unit_price")
    .eq("order_id", orderId);
  const { data: store } = await supabaseAdmin.from("store_settings").select("*").limit(1).maybeSingle();

  const data: OrderEmailData = {
    storeName: store?.store_name ?? "JoyDesk",
    orderNumber: order.order_number,
    customerName: order.customer_name,
    items: (items ?? []).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    paymentMethod: order.payment_method,
    siteUrl,
    ...extra,
  };

  const enabled =
    key === "order_confirmation"
      ? s?.notify_order_confirmation
      : key === "payment_received"
        ? s?.notify_payment_received
        : key === "shipping_update"
          ? s?.notify_shipping_update
          : s?.notify_admin_new_order;
  if (!enabled) return;

  const { subject, html } = renderTemplate(key, data);
  const to = key === "admin_new_order" ? s?.admin_notify_email || "" : order.customer_email || "";
  if (to) await sendEmail({ to, subject, html, template: key, orderId });

  if (key !== "admin_new_order" && order.customer_phone) {
    const sms =
      key === "payment_received"
        ? `Payment received for order ${order.order_number}. Thank you for shopping with ${data.storeName}!`
        : key === "shipping_update"
          ? `Order ${order.order_number} update: ${data.status ?? "in transit"}. Track: ${siteUrl}/track`
          : `Hi ${order.customer_name}, order ${order.order_number} is confirmed. Total ${data.total}. ${data.storeName}`;
    await sendSms({ to: order.customer_phone, message: sms, orderId });
  }
}
