/** Fallback origin used only when there is no browser window (SSR / server code). */
export const SITE_URL = "https://joydesk.lovable.app";

/**
 * Current public origin. Always prefers the live window origin so links follow
 * whatever domain the visitor is actually on (preview, Vercel, custom domain).
 */
export function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return SITE_URL;
}

/** Stable, shareable payment link for an order (used in receipts + WhatsApp). */
export function paymentLink(orderNumber: string, origin = siteOrigin()) {
  return `${origin}/pay/${encodeURIComponent(orderNumber)}`;
}

/** Tracking link for an order. */
export function trackingLink(orderNumber: string, origin = siteOrigin()) {
  return `${origin}/track?order=${encodeURIComponent(orderNumber)}`;
}
