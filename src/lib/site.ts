/** Canonical public origin — payment links must stay stable across previews. */
export const SITE_URL = "https://joydesk.lovable.app";

/** Stable, shareable payment link for an order (used in receipts + WhatsApp). */
export function paymentLink(orderNumber: string) {
  return `${SITE_URL}/pay/${encodeURIComponent(orderNumber)}`;
}

/** Stable tracking link for an order. */
export function trackingLink(orderNumber: string) {
  return `${SITE_URL}/track?order=${encodeURIComponent(orderNumber)}`;
}
