// Branded HTML email templates. Plain template literals so they work in any runtime.
export interface OrderLine {
  name: string;
  quantity: number;
  unit_price: number;
}

const BRAND = {
  primary: "#0F4C81",
  secondary: "#FF8C00",
  accent: "#10B981",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
};

function money(n: number) {
  return `KSh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function shell(opts: { title: string; preview: string; body: string; storeName?: string }) {
  const store = opts.storeName || "JoyDesk";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:${BRAND.text}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden">
    <tr><td style="background:${BRAND.primary};padding:22px 28px;color:#ffffff">
      <div style="font-size:20px;font-weight:700;letter-spacing:-0.3px">${esc(store)}</div>
      <div style="font-size:12px;opacity:.85;margin-top:2px">Comfort Meets Productivity</div>
    </td></tr>
    <tr><td style="padding:28px">${opts.body}</td></tr>
    <tr><td style="padding:18px 28px;background:#F9FAFB;border-top:1px solid ${BRAND.border};font-size:12px;color:${BRAND.muted}">
      &copy; ${new Date().getFullYear()} ${esc(store)}. Nairobi, Kenya.
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

function itemsTable(items: OrderLine[]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;font-size:14px">
  ${items
    .map(
      (i) => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border}">${esc(i.name)} <span style="color:${BRAND.muted}">× ${i.quantity}</span></td>
      <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};white-space:nowrap">${money(i.unit_price * i.quantity)}</td>
    </tr>`,
    )
    .join("")}
</table>`;
}

function totals(rows: [string, string][], strongLast = true) {
  return `<table role="presentation" width="100%" style="margin-top:14px;font-size:14px">
  ${rows
    .map(
      ([k, v], idx) => `<tr>
    <td style="padding:4px 0;color:${BRAND.muted}">${esc(k)}</td>
    <td align="right" style="padding:4px 0;${strongLast && idx === rows.length - 1 ? "font-weight:700;font-size:16px" : ""}">${esc(v)}</td>
  </tr>`,
    )
    .join("")}
</table>`;
}

function button(href: string, label: string) {
  return `<div style="margin-top:22px"><a href="${esc(href)}" style="background:${BRAND.secondary};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block">${esc(label)}</a></div>`;
}

export interface OrderEmailData {
  storeName?: string;
  orderNumber: string;
  customerName: string;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  siteUrl: string;
  paymentMethod?: string;
  receiptNumber?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  status?: string | null;
  message?: string;
  subjectOverride?: string;
}

export type TemplateKey =
  | "order_confirmation"
  | "payment_received"
  | "shipping_update"
  | "admin_new_order"
  | "custom";

export function renderTemplate(key: TemplateKey, d: OrderEmailData): { subject: string; html: string } {
  const store = d.storeName || "JoyDesk";
  switch (key) {
    case "order_confirmation": {
      const body = `<h1 style="margin:0;font-size:22px">Thanks for your order, ${esc(d.customerName)}!</h1>
      <p style="color:${BRAND.muted};font-size:14px;line-height:22px">We've received order <strong style="color:${BRAND.text}">${esc(d.orderNumber)}</strong> and are getting it ready. You'll hear from us the moment it ships.</p>
      ${itemsTable(d.items)}
      ${totals([
        ["Subtotal", money(d.subtotal)],
        ["Discount", `- ${money(d.discount)}`],
        ["Delivery", money(d.deliveryFee)],
        ["Total", money(d.total)],
      ])}
      ${button(`${d.siteUrl}/order-success/${d.orderNumber}`, "View your order")}`;
      return {
        subject: `Order ${d.orderNumber} confirmed — ${store}`,
        html: shell({ title: "Order confirmed", preview: `Order ${d.orderNumber} confirmed`, body, storeName: store }),
      };
    }
    case "payment_received": {
      const body = `<h1 style="margin:0;font-size:22px">Payment received</h1>
      <p style="color:${BRAND.muted};font-size:14px;line-height:22px">We've confirmed your M-Pesa payment of <strong style="color:${BRAND.accent}">${money(d.total)}</strong> for order <strong style="color:${BRAND.text}">${esc(d.orderNumber)}</strong>.</p>
      ${d.receiptNumber ? `<p style="font-size:14px">M-Pesa receipt: <strong>${esc(d.receiptNumber)}</strong></p>` : ""}
      ${itemsTable(d.items)}
      ${totals([["Amount paid", money(d.total)]])}
      ${button(`${d.siteUrl}/order-success/${d.orderNumber}`, "Download receipt")}`;
      return {
        subject: `Payment confirmed for ${d.orderNumber} — ${store}`,
        html: shell({ title: "Payment received", preview: "Your payment was confirmed", body, storeName: store }),
      };
    }
    case "shipping_update": {
      const body = `<h1 style="margin:0;font-size:22px">Your order is ${esc(d.status || "on the move")}</h1>
      <p style="color:${BRAND.muted};font-size:14px;line-height:22px">Order <strong style="color:${BRAND.text}">${esc(d.orderNumber)}</strong> has a new shipping update.</p>
      ${totals(
        [
          ["Courier", d.courier || "JoyDesk Logistics"],
          ["Tracking number", d.trackingNumber || "—"],
          ["Status", d.status || "processing"],
        ],
        false,
      )}
      ${d.message ? `<p style="font-size:14px;line-height:22px">${esc(d.message)}</p>` : ""}
      ${button(`${d.siteUrl}/track?order=${d.orderNumber}`, "Track your delivery")}`;
      return {
        subject: `Shipping update for ${d.orderNumber} — ${store}`,
        html: shell({ title: "Shipping update", preview: "Shipping update", body, storeName: store }),
      };
    }
    case "admin_new_order": {
      const body = `<h1 style="margin:0;font-size:22px">New order ${esc(d.orderNumber)}</h1>
      <p style="color:${BRAND.muted};font-size:14px">From ${esc(d.customerName)} · ${esc(d.paymentMethod || "mpesa")}</p>
      ${itemsTable(d.items)}
      ${totals([["Order total", money(d.total)]])}
      ${button(`${d.siteUrl}/admin/orders`, "Open admin dashboard")}`;
      return {
        subject: `New order ${d.orderNumber} (${money(d.total)})`,
        html: shell({ title: "New order", preview: "New order received", body, storeName: store }),
      };
    }
    default: {
      const body = `<h1 style="margin:0;font-size:22px">${esc(d.subjectOverride || `A note from ${store}`)}</h1>
      <p style="color:${BRAND.muted};font-size:14px;line-height:22px">${esc(d.message || "")}</p>`;
      return {
        subject: d.subjectOverride || `${store} notification`,
        html: shell({ title: "Notification", preview: d.message || "", body, storeName: store }),
      };
    }
  }
}

/** Password reset email — link always points at the domain the request came from. */
export function renderPasswordResetEmail(opts: {
  storeName?: string;
  link: string;
  minutes?: number;
}): { subject: string; html: string } {
  const store = opts.storeName || "JoyDesk";
  const body = `<h1 style="margin:0;font-size:22px">Reset your password</h1>
  <p style="color:${BRAND.muted};font-size:14px;line-height:22px">We received a request to reset the password for your ${esc(store)} account. This link expires in ${opts.minutes ?? 60} minutes and can only be used once.</p>
  ${button(opts.link, "Set a new password")}
  <p style="color:${BRAND.muted};font-size:12px;line-height:20px;margin-top:22px;word-break:break-all">If the button doesn't work, paste this into your browser:<br><a href="${esc(opts.link)}" style="color:${BRAND.primary}">${esc(opts.link)}</a></p>
  <p style="color:${BRAND.muted};font-size:12px;line-height:20px">Didn't ask for this? You can safely ignore this email — your password stays unchanged.</p>`;
  return {
    subject: `Reset your ${store} password`,
    html: shell({ title: "Reset your password", preview: "Reset your password", body, storeName: store }),
  };
}
