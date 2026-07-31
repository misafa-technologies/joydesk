// Server-only M-Pesa Daraja helpers (STK Push, query, callback processing).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface MpesaConfig {
  id: string;
  environment: string;
  mode: string;
  short_code: string | null;
  party_b: string | null;
  passkey: string | null;
  consumer_key: string | null;
  consumer_secret: string | null;
  callback_url: string | null;
  account_reference: string | null;
  transaction_desc: string | null;
  is_active: boolean;
}

export async function loadMpesaConfig(): Promise<MpesaConfig> {
  const { data, error } = await supabaseAdmin
    .from("mpesa_config")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("M-Pesa is not configured yet. An admin must add Daraja credentials.");
  if (!data.consumer_key || !data.consumer_secret || !data.short_code || !data.passkey) {
    throw new Error("M-Pesa configuration is incomplete. Add consumer key, secret, shortcode and passkey.");
  }
  return data as MpesaConfig;
}

function baseUrl(env: string) {
  return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function b64(input: string): string {
  return btoa(input);
}

export async function getAccessToken(cfg: MpesaConfig): Promise<string> {
  const res = await fetch(`${baseUrl(cfg.environment)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${b64(`${cfg.consumer_key}:${cfg.consumer_secret}`)}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Daraja auth failed [${res.status}]: ${body}`);
  const json = JSON.parse(body) as { access_token?: string };
  if (!json.access_token) throw new Error(`Daraja auth returned no token: ${body}`);
  return json.access_token;
}

export async function stkPush(params: {
  cfg: MpesaConfig;
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
}) {
  const { cfg, phone, amount, accountReference, description } = params;
  const token = await getAccessToken(cfg);
  const ts = timestamp();
  const shortCode = cfg.short_code!;
  const password = b64(`${shortCode}${cfg.passkey}${ts}`);
  const transactionType = cfg.mode === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline";

  const payload = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: ts,
    TransactionType: transactionType,
    Amount: Math.max(1, Math.round(amount)),
    PartyA: phone,
    PartyB: cfg.party_b || shortCode,
    PhoneNumber: phone,
    CallBackURL: cfg.callback_url,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: description.slice(0, 60),
  };

  const res = await fetch(`${baseUrl(cfg.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Daraja STK push returned a non-JSON response [${res.status}]: ${text}`);
  }
  if (!res.ok || json["ResponseCode"] !== "0") {
    throw new Error(
      `STK push failed [${res.status}]: ${String(json["errorMessage"] ?? json["ResponseDescription"] ?? text)}`,
    );
  }
  return json as {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    CustomerMessage: string;
  };
}

export async function stkQuery(cfg: MpesaConfig, checkoutRequestId: string) {
  const token = await getAccessToken(cfg);
  const ts = timestamp();
  const shortCode = cfg.short_code!;
  const res = await fetch(`${baseUrl(cfg.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: b64(`${shortCode}${cfg.passkey}${ts}`),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    throw new Error(`Daraja query returned a non-JSON response [${res.status}]: ${text}`);
  }
}

/** Applies a terminal M-Pesa result to the payment row and its order. */
export async function applyPaymentResult(params: {
  checkoutRequestId: string;
  resultCode: string;
  resultDesc: string;
  receipt?: string | null;
  raw?: unknown;
}) {
  const { checkoutRequestId, resultCode, resultDesc, receipt, raw } = params;
  const success = String(resultCode) === "0";

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, order_id, status")
    .eq("checkout_request_id", checkoutRequestId)
    .maybeSingle();

  await supabaseAdmin
    .from("payments")
    .update({
      status: success ? "success" : "failed",
      result_code: String(resultCode),
      result_desc: resultDesc,
      mpesa_receipt: receipt ?? null,
      raw: (raw ?? null) as never,
    })
    .eq("checkout_request_id", checkoutRequestId);

  if (payment?.order_id) {
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: success ? "paid" : "failed",
        status: success ? "confirmed" : "pending",
      })
      .eq("id", payment.order_id);
  }

  return { success, orderId: payment?.order_id ?? null, alreadyHandled: payment?.status === "success" };
}
