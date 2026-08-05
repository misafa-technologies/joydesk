import { formatKES, formatDateTime } from "@/lib/format";
import { trackingLink } from "@/lib/site";

export interface DeliveryNoteOrder {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  county?: string | null;
  sub_county?: string | null;
  town?: string | null;
  street?: string | null;
  notes?: string | null;
  delivery_method: string;
  payment_status: string;
  total: number | string;
}

export interface DeliveryNoteItem {
  product_name: string;
  quantity: number;
  unit_price: number | string;
}

export interface DeliveryNoteShipment {
  tracking_number?: string | null;
  courier?: string | null;
  courier_contact?: string | null;
}

export interface DeliveryNoteBranding {
  storeName?: string | null;
  tagline?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  logoUrl?: string | null;
}

export interface DeliveryNoteData {
  order: DeliveryNoteOrder;
  items: DeliveryNoteItem[];
  shipment?: DeliveryNoteShipment | null;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function signatureBlock(role: string, hint: string) {
  return `<div class="sig">
    <div class="sig-role">${esc(role)}</div>
    <div class="sig-line"></div><div class="sig-cap">Name</div>
    <div class="sig-line"></div><div class="sig-cap">Signature</div>
    <div class="sig-row"><span><span class="sig-line short"></span><span class="sig-cap">Date</span></span>
      <span><span class="sig-line short"></span><span class="sig-cap">Phone / ID</span></span></div>
    <div class="sig-hint">${esc(hint)}</div>
  </div>`;
}

function notePage(data: DeliveryNoteData, brand: DeliveryNoteBranding, index: number) {
  const { order, items, shipment } = data;
  const store = brand.storeName || "JoyDesk";
  const address = order.county
    ? [order.street, order.town, order.sub_county, order.county].filter(Boolean).join(", ")
    : "Store pickup";
  const units = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  return `<section class="note${index > 0 ? " break" : ""}">
  <header>
    <div class="brandbox">
      ${brand.logoUrl ? `<img class="logo" src="${esc(brand.logoUrl)}" alt="${esc(store)}" />` : ""}
      <div>
        <div class="brand">${esc(store)}</div>
        <div class="tag">${esc(brand.tagline || "Comfort Meets Productivity")}</div>
        <div class="tag">${esc(brand.supportPhone || "")} ${esc(brand.supportEmail || "")}</div>
      </div>
    </div>
    <div class="doc">
      <b>DELIVERY NOTE</b><br />
      <span class="tag">DN-${esc(order.order_number)}</span><br />
      <span class="tag">Issued ${esc(formatDateTime(new Date().toISOString()))}</span>
    </div>
  </header>

  <div class="meta">
    <div><div class="k">Deliver to</div>${esc(order.customer_name)}<br />${esc(order.customer_phone)}${order.customer_email ? `<br />${esc(order.customer_email)}` : ""}</div>
    <div><div class="k">Delivery address — ${esc(order.delivery_method)}</div>${esc(address)}${order.notes ? `<br /><i>${esc(order.notes)}</i>` : ""}</div>
    <div><div class="k">Order</div>${esc(order.order_number)}<br />Placed ${esc(formatDateTime(order.created_at))}<br />Payment: <b>${esc(order.payment_status)}</b></div>
  </div>

  <div class="meta">
    <div><div class="k">Courier</div>${esc(shipment?.courier || "Not yet assigned")}</div>
    <div><div class="k">Courier contact</div>${esc(shipment?.courier_contact || "—")}</div>
    <div><div class="k">Tracking</div>${esc(shipment?.tracking_number || "—")}<br /><span class="tag">${esc(trackingLink(order.order_number))}</span></div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Item</th><th class="n">Qty</th><th class="n">Unit</th><th class="n">Amount</th><th class="n">Checked</th></tr></thead>
    <tbody>${items
      .map(
        (i, n) =>
          `<tr><td>${n + 1}</td><td>${esc(i.product_name)}</td><td class="n">${i.quantity}</td><td class="n">${formatKES(i.unit_price)}</td><td class="n">${formatKES(Number(i.unit_price) * i.quantity)}</td><td class="n box">&nbsp;</td></tr>`,
      )
      .join("")}</tbody>
    <tfoot>
      <tr><td colspan="2"><b>Total units: ${units}</b></td><td colspan="3" class="n"><b>Order value ${formatKES(order.total)}</b></td><td></td></tr>
    </tfoot>
  </table>

  <div class="sigs">
    ${signatureBlock("Released by (in-house dispatch)", "Confirms goods left the JoyDesk warehouse complete and undamaged.")}
    ${signatureBlock("Delivery person / courier rider", "Accepts custody of the goods listed above for delivery.")}
    ${signatureBlock("Received by (customer)", "Confirms all items were received in good condition.")}
    ${signatureBlock("Authorised by (JoyDesk)", "Operations authoriser approving this dispatch.")}
  </div>

  <footer>
    <span>${esc(store)} · ${esc(brand.supportPhone || "")} · ${esc(brand.supportEmail || "")}</span>
    <span>Any shortage or damage must be reported within 24 hours of delivery.</span>
  </footer>
</section>`;
}

/** Printable delivery note(s) — one A4 page per order, signature blocks for all parties. */
export function buildDeliveryNoteHtml(notes: DeliveryNoteData[], brand: DeliveryNoteBranding = {}) {
  const title =
    notes.length === 1 ? `Delivery note ${notes[0]!.order.order_number}` : `Delivery notes (${notes.length} orders)`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(title)} — ${esc(brand.storeName || "JoyDesk")}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif; color:#111827; margin:0; font-size:11px; line-height:1.45; padding:12px; }
  .note { max-width: 186mm; margin: 0 auto 26px; }
  .note.break { page-break-before: always; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; border-bottom:2px solid #0F4C81; padding-bottom:8px; }
  .brandbox { display:flex; gap:10px; align-items:center; }
  .logo { height:34px; width:auto; max-width:120px; object-fit:contain; }
  .brand { font-size:16px; font-weight:800; color:#0F4C81; }
  .tag { color:#6b7280; font-size:9.5px; }
  .doc { text-align:right; }
  .doc b { font-size:13px; letter-spacing:.5px; }
  .meta { display:flex; gap:14px; margin-top:10px; }
  .meta > div { flex:1; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; }
  .k { color:#6b7280; font-size:9px; text-transform:uppercase; letter-spacing:.4px; margin-bottom:2px; }
  table { width:100%; border-collapse:collapse; margin-top:12px; }
  th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.4px; color:#6b7280; border-bottom:1px solid #e5e7eb; padding:5px 4px; }
  td { padding:5px 4px; border-bottom:1px solid #f3f4f6; }
  td.n, th.n { text-align:right; white-space:nowrap; }
  td.box { border:1px solid #d1d5db; width:52px; }
  tfoot td { border-top:1.5px solid #0F4C81; }
  .sigs { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }
  .sig { border:1px solid #e5e7eb; border-radius:6px; padding:8px 10px; }
  .sig-role { font-weight:700; font-size:10.5px; color:#0F4C81; margin-bottom:8px; }
  .sig-line { display:block; border-bottom:1px solid #9ca3af; height:16px; margin-top:6px; }
  .sig-line.short { width:100%; }
  .sig-cap { font-size:8.5px; color:#6b7280; }
  .sig-row { display:flex; gap:10px; }
  .sig-row > span { flex:1; }
  .sig-hint { margin-top:6px; font-size:8.5px; color:#9ca3af; }
  footer { margin-top:12px; border-top:1px solid #e5e7eb; padding-top:6px; color:#6b7280; font-size:9px; display:flex; justify-content:space-between; gap:10px; }
  .noprint { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin:6px 0 20px; }
  .noprint button { font:inherit; font-weight:600; padding:9px 16px; border-radius:6px; border:1px solid #0F4C81; background:#0F4C81; color:#fff; cursor:pointer; }
  .noprint button.ghost { background:#fff; color:#0F4C81; }
  @media print { .noprint { display:none !important; } body { padding:0; } }
  @media screen and (max-width: 640px) {
    body { font-size:12px; }
    header, .meta, .sigs { flex-direction:column; grid-template-columns:1fr; }
    .doc { text-align:left; }
    .noprint button { flex:1 1 45%; }
  }
</style></head><body>
<div class="noprint">
  <button onclick="window.print()">Print / Save as PDF</button>
  <button class="ghost" onclick="window.__download()">Download</button>
  <button class="ghost" onclick="window.close()">Close</button>
</div>
${notes.map((n, i) => notePage(n, brand, i)).join("")}
<script>
  (function () {
    var snapshot = document.documentElement.outerHTML;
    window.__download = function () {
      var blob = new Blob(['<!doctype html>' + snapshot], { type: 'text/html' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = ${JSON.stringify(`${notes.length === 1 ? `Delivery-Note-${notes[0]?.order.order_number ?? ""}` : "Delivery-Notes"}.html`)};
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    };
  })();
</script>
</body></html>`;
}

/** Opens a print preview of one or more delivery notes in a new tab. */
export function previewDeliveryNote(notes: DeliveryNoteData[], brand: DeliveryNoteBranding = {}) {
  const html = buildDeliveryNoteHtml(notes, brand);
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) {
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Delivery-Notes.html";
    a.click();
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
}
