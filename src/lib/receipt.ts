import { formatKES, formatDateTime } from "@/lib/format";
import { paymentLink, trackingLink } from "@/lib/site";

export interface ReceiptOrder {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  county?: string | null;
  sub_county?: string | null;
  town?: string | null;
  street?: string | null;
  delivery_method: string;
  subtotal: number | string;
  discount: number | string;
  delivery_fee: number | string;
  total: number | string;
  payment_status: string;
}

export interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number | string;
}

export interface ReceiptBranding {
  storeName?: string | null;
  tagline?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  paybill?: string | null;
  receipt?: string | null;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * A compact, single-page A5-on-A4 receipt that prints cleanly on ordinary
 * home/office printers (no oversized type, 12mm margins, no page breaks).
 */
export function buildReceiptHtml(order: ReceiptOrder, items: ReceiptItem[], brand: ReceiptBranding = {}) {
  const store = brand.storeName || "JoyDesk";
  const address = order.county
    ? [order.street, order.town, order.sub_county, order.county].filter(Boolean).join(", ")
    : "Store pickup";
  const paid = order.payment_status === "paid";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>Receipt ${esc(order.order_number)} — ${esc(store)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif; color:#111827; margin:0; font-size:11px; line-height:1.45; }
  .sheet { max-width: 148mm; margin: 0 auto; }
  header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0F4C81; padding-bottom:8px; }
  .brand { font-size:16px; font-weight:800; color:#0F4C81; letter-spacing:-.2px; }
  .tag { color:#6b7280; font-size:9.5px; }
  .doc { text-align:right; }
  .doc b { font-size:12px; }
  .status { display:inline-block; margin-top:3px; padding:1.5px 6px; border-radius:99px; font-size:9px; font-weight:700;
            background:${paid ? "#ecfdf5" : "#fff7ed"}; color:${paid ? "#047857" : "#b45309"}; }
  .meta { display:flex; gap:14px; margin-top:10px; }
  .meta div { flex:1; }
  .k { color:#6b7280; font-size:9px; text-transform:uppercase; letter-spacing:.4px; }
  table { width:100%; border-collapse:collapse; margin-top:12px; }
  th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.4px; color:#6b7280; border-bottom:1px solid #e5e7eb; padding:5px 4px; }
  td { padding:5px 4px; border-bottom:1px solid #f3f4f6; }
  td.n, th.n { text-align:right; white-space:nowrap; }
  tfoot td { border:none; padding:2.5px 4px; }
  tfoot tr.total td { border-top:1.5px solid #0F4C81; font-weight:800; font-size:12px; padding-top:5px; }
  .pay { margin-top:12px; border:1px solid #e5e7eb; border-radius:6px; padding:8px 10px; background:#f9fafb; }
  .pay a { color:#0F4C81; }
  footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:6px; color:#6b7280; font-size:9px; display:flex; justify-content:space-between; gap:10px; }
  @media print { .noprint { display:none !important; } body { font-size:10.5px; } }
  .noprint { text-align:center; margin:14px 0 0; }
  .noprint button { font:inherit; font-weight:600; padding:7px 16px; border-radius:6px; border:1px solid #0F4C81; background:#0F4C81; color:#fff; cursor:pointer; }
</style></head><body><div class="sheet">
<header>
  <div><div class="brand">${esc(store)}</div><div class="tag">${esc(brand.tagline || "Comfort Meets Productivity")}</div></div>
  <div class="doc"><b>RECEIPT</b><br /><span class="tag">${esc(order.order_number)}</span><br />
    <span class="status">${paid ? "PAID" : esc(order.payment_status).toUpperCase()}</span></div>
</header>

<div class="meta">
  <div><div class="k">Billed to</div>${esc(order.customer_name)}<br />${esc(order.customer_phone)}${order.customer_email ? `<br />${esc(order.customer_email)}` : ""}</div>
  <div><div class="k">Delivery — ${esc(order.delivery_method)}</div>${esc(address)}</div>
  <div><div class="k">Issued</div>${esc(formatDateTime(order.created_at))}</div>
</div>

<table>
  <thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Unit</th><th class="n">Amount</th></tr></thead>
  <tbody>${items
    .map(
      (i) =>
        `<tr><td>${esc(i.product_name)}</td><td class="n">${i.quantity}</td><td class="n">${formatKES(i.unit_price)}</td><td class="n">${formatKES(Number(i.unit_price) * i.quantity)}</td></tr>`,
    )
    .join("")}</tbody>
  <tfoot>
    <tr><td colspan="3" class="n">Subtotal</td><td class="n">${formatKES(order.subtotal)}</td></tr>
    ${Number(order.discount) > 0 ? `<tr><td colspan="3" class="n">Discount</td><td class="n">−${formatKES(order.discount)}</td></tr>` : ""}
    <tr><td colspan="3" class="n">Delivery</td><td class="n">${formatKES(order.delivery_fee)}</td></tr>
    <tr class="total"><td colspan="3" class="n">Total</td><td class="n">${formatKES(order.total)}</td></tr>
  </tfoot>
</table>

<div class="pay">
  <div class="k">Payment</div>
  M-Pesa Paybill <b>${esc(brand.paybill || "—")}</b> · Account <b>${esc(order.order_number)}</b>${brand.receipt ? ` · M-Pesa code <b>${esc(brand.receipt)}</b>` : ""}<br />
  ${paid ? "" : `Pay online: <a href="${paymentLink(order.order_number)}">${paymentLink(order.order_number)}</a><br />`}
  Track: <a href="${trackingLink(order.order_number)}">${trackingLink(order.order_number)}</a>
</div>

<footer><span>Thank you for shopping with ${esc(store)}.</span><span>${esc(brand.supportPhone || "")} ${esc(brand.supportEmail || "")}</span></footer>
<div class="noprint"><button onclick="window.print()">Print receipt</button></div>
</div></body></html>`;
}

/** Opens the receipt in a new tab and triggers the browser print dialog. */
export function printReceipt(order: ReceiptOrder, items: ReceiptItem[], brand: ReceiptBranding = {}) {
  const html = buildReceiptHtml(order, items, brand);
  const win = window.open("", "_blank", "width=820,height=980");
  if (!win) {
    downloadReceipt(order, items, brand);
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

/** Saves the receipt as a self-contained HTML file. */
export function downloadReceipt(order: ReceiptOrder, items: ReceiptItem[], brand: ReceiptBranding = {}) {
  const blob = new Blob([buildReceiptHtml(order, items, brand)], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Receipt-${order.order_number}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
