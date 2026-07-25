export function formatKES(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function discountPercent(price: number, comparePrice?: number | null): number | null {
  if (!comparePrice || comparePrice <= price) return null;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Normalises Kenyan phone numbers to the 2547XXXXXXXX format Daraja expects. */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = (input || "").replace(/[^\d]/g, "");
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}
