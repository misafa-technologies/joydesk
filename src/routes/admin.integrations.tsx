import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Send, Smartphone, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendTestNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — JoyDesk Admin" },
      { name: "description", content: "Configure M-Pesa Daraja, SMTP email and Africa's Talking SMS for JoyDesk." },
      { property: "og:title", content: "Integrations — JoyDesk Admin" },
      { property: "og:description", content: "Admin configuration for payments, email and SMS." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Integrations,
});

const CALLBACK_URL = "https://joydesk.lovable.app/api/public/mpesa/callback";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-accent" : "bg-muted"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${checked ? "left-[1.15rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

type AnyRecord = Record<string, unknown>;

function Integrations() {
  const qc = useQueryClient();
  const testFn = useServerFn(sendTestNotification);

  const { data: mpesaRow, isLoading: mpesaLoading } = useQuery({
    queryKey: ["admin-mpesa-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mpesa_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: settingsRow, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-integration-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [mpesa, setMpesa] = useState<AnyRecord>({});
  const [cfg, setCfg] = useState<AnyRecord>({});
  const [savingMpesa, setSavingMpesa] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState<"email" | "sms" | null>(null);

  useEffect(() => {
    if (mpesaRow) setMpesa(mpesaRow as AnyRecord);
    else if (!mpesaLoading) setMpesa({ environment: "sandbox", mode: "paybill", is_active: true, callback_url: CALLBACK_URL });
  }, [mpesaRow, mpesaLoading]);

  useEffect(() => {
    if (settingsRow) setCfg(settingsRow as AnyRecord);
  }, [settingsRow]);

  const set = (setter: typeof setMpesa) => (key: string, value: unknown) =>
    setter((prev) => ({ ...prev, [key]: value }));
  const setM = set(setMpesa);
  const setC = set(setCfg);

  async function saveMpesa() {
    setSavingMpesa(true);
    try {
      const payload = {
        environment: String(mpesa["environment"] ?? "sandbox"),
        mode: String(mpesa["mode"] ?? "paybill"),
        short_code: (mpesa["short_code"] as string) || null,
        party_b: (mpesa["party_b"] as string) || null,
        passkey: (mpesa["passkey"] as string) || null,
        consumer_key: (mpesa["consumer_key"] as string) || null,
        consumer_secret: (mpesa["consumer_secret"] as string) || null,
        callback_url: (mpesa["callback_url"] as string) || CALLBACK_URL,
        account_reference: (mpesa["account_reference"] as string) || "JoyDesk",
        transaction_desc: (mpesa["transaction_desc"] as string) || "JoyDesk Order Payment",
        whatsapp_number: (mpesa["whatsapp_number"] as string) || null,
        is_active: mpesa["is_active"] !== false,
      };
      const { error } = mpesa["id"]
        ? await supabase.from("mpesa_config").update(payload).eq("id", mpesa["id"] as string)
        : await supabase.from("mpesa_config").insert(payload);
      if (error) throw error;
      toast.success("M-Pesa configuration saved");
      qc.invalidateQueries({ queryKey: ["admin-mpesa-config"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingMpesa(false);
    }
  }

  async function saveSettings() {
    setSavingCfg(true);
    try {
      const payload = {
        email_enabled: cfg["email_enabled"] === true,
        email_provider: String(cfg["email_provider"] ?? "smtp"),
        smtp_host: (cfg["smtp_host"] as string) || null,
        smtp_port: Number(cfg["smtp_port"] ?? 587),
        smtp_secure: cfg["smtp_secure"] === true,
        smtp_user: (cfg["smtp_user"] as string) || null,
        smtp_password: (cfg["smtp_password"] as string) || null,
        resend_api_key: (cfg["resend_api_key"] as string) || null,
        from_name: (cfg["from_name"] as string) || "JoyDesk",
        from_email: (cfg["from_email"] as string) || null,
        admin_notify_email: (cfg["admin_notify_email"] as string) || null,
        sms_enabled: cfg["sms_enabled"] === true,
        at_username: (cfg["at_username"] as string) || null,
        at_api_key: (cfg["at_api_key"] as string) || null,
        at_sender_id: (cfg["at_sender_id"] as string) || null,
        at_sandbox: cfg["at_sandbox"] !== false,
        notify_order_confirmation: cfg["notify_order_confirmation"] !== false,
        notify_payment_received: cfg["notify_payment_received"] !== false,
        notify_shipping_update: cfg["notify_shipping_update"] !== false,
        notify_admin_new_order: cfg["notify_admin_new_order"] !== false,
      };
      const { error } = cfg["id"]
        ? await supabase.from("integration_settings").update(payload).eq("id", cfg["id"] as string)
        : await supabase.from("integration_settings").insert(payload);
      if (error) throw error;
      toast.success("Notification settings saved");
      qc.invalidateQueries({ queryKey: ["admin-integration-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingCfg(false);
    }
  }

  async function runTest(channel: "email" | "sms") {
    const to = channel === "email" ? testEmail.trim() : testPhone.trim();
    if (!to) return toast.error(channel === "email" ? "Enter a test email address" : "Enter a test phone number");
    setTesting(channel);
    try {
      const res = (await testFn({ data: { channel, to } })) as { sent: boolean; reason?: string };
      if (res.sent) toast.success(`Test ${channel} sent to ${to}`);
      else toast.error(`Not sent: ${res.reason ?? "unknown error"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(null);
    }
  }

  if (mpesaLoading || settingsLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading integrations…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All API credentials are stored here — no code changes needed.
        </p>
      </div>

      {/* M-PESA */}
      <section className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">M-Pesa Daraja (STK Push)</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Environment">
            <select className={inputClass} value={String(mpesa["environment"] ?? "sandbox")} onChange={(e) => setM("environment", e.target.value)}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </Field>
          <Field label="Mode">
            <select className={inputClass} value={String(mpesa["mode"] ?? "paybill")} onChange={(e) => setM("mode", e.target.value)}>
              <option value="paybill">Paybill (CustomerPayBillOnline)</option>
              <option value="till">Till / Buy Goods (CustomerBuyGoodsOnline)</option>
            </select>
          </Field>
          <Field label="Business short code">
            <input className={inputClass} value={String(mpesa["short_code"] ?? "")} onChange={(e) => setM("short_code", e.target.value)} />
          </Field>
          <Field label="Party B" hint="Usually the same as the short code; for till numbers use the store number.">
            <input className={inputClass} value={String(mpesa["party_b"] ?? "")} onChange={(e) => setM("party_b", e.target.value)} />
          </Field>
          <Field label="Consumer key">
            <input className={inputClass} value={String(mpesa["consumer_key"] ?? "")} onChange={(e) => setM("consumer_key", e.target.value)} />
          </Field>
          <Field label="Consumer secret">
            <input type="password" className={inputClass} value={String(mpesa["consumer_secret"] ?? "")} onChange={(e) => setM("consumer_secret", e.target.value)} />
          </Field>
          <Field label="Passkey">
            <input type="password" className={inputClass} value={String(mpesa["passkey"] ?? "")} onChange={(e) => setM("passkey", e.target.value)} />
          </Field>
          <Field label="Callback URL" hint="Register this exact URL on the Daraja portal.">
            <input className={inputClass} value={String(mpesa["callback_url"] ?? CALLBACK_URL)} onChange={(e) => setM("callback_url", e.target.value)} />
          </Field>
          <Field label="Account reference">
            <input className={inputClass} value={String(mpesa["account_reference"] ?? "JoyDesk")} onChange={(e) => setM("account_reference", e.target.value)} />
          </Field>
          <Field label="Transaction description">
            <input className={inputClass} value={String(mpesa["transaction_desc"] ?? "")} onChange={(e) => setM("transaction_desc", e.target.value)} />
          </Field>
          <Field label="WhatsApp follow-up number" hint="Used for the post-payment WhatsApp confirmation, e.g. 254700000000.">
            <input className={inputClass} value={String(mpesa["whatsapp_number"] ?? "")} onChange={(e) => setM("whatsapp_number", e.target.value)} />
          </Field>
          <div className="self-end">
            <Toggle checked={mpesa["is_active"] !== false} onChange={(v) => setM("is_active", v)} label="M-Pesa enabled" />
          </div>
        </div>
        <button
          onClick={saveMpesa}
          disabled={savingMpesa}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {savingMpesa ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save M-Pesa settings
        </button>
      </section>

      {/* EMAIL */}
      <section className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Email notifications (SMTP / Nodemailer)</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Toggle checked={cfg["email_enabled"] === true} onChange={(v) => setC("email_enabled", v)} label="Email sending enabled" />
          </div>
          <Field label="Provider">
            <select className={inputClass} value={String(cfg["email_provider"] ?? "smtp")} onChange={(e) => setC("email_provider", e.target.value)}>
              <option value="smtp">SMTP (Nodemailer)</option>
              <option value="resend">Resend HTTP API</option>
            </select>
          </Field>
          <Field label="From name">
            <input className={inputClass} value={String(cfg["from_name"] ?? "")} onChange={(e) => setC("from_name", e.target.value)} />
          </Field>
          <Field label="From email">
            <input className={inputClass} value={String(cfg["from_email"] ?? "")} onChange={(e) => setC("from_email", e.target.value)} />
          </Field>
          <Field label="Admin alert email" hint="Where new-order alerts are sent.">
            <input className={inputClass} value={String(cfg["admin_notify_email"] ?? "")} onChange={(e) => setC("admin_notify_email", e.target.value)} />
          </Field>
          {String(cfg["email_provider"] ?? "smtp") === "resend" ? (
            <Field label="Resend API key">
              <input type="password" className={inputClass} value={String(cfg["resend_api_key"] ?? "")} onChange={(e) => setC("resend_api_key", e.target.value)} />
            </Field>
          ) : (
            <>
              <Field label="SMTP host">
                <input className={inputClass} value={String(cfg["smtp_host"] ?? "")} onChange={(e) => setC("smtp_host", e.target.value)} />
              </Field>
              <Field label="SMTP port">
                <input type="number" className={inputClass} value={String(cfg["smtp_port"] ?? 587)} onChange={(e) => setC("smtp_port", Number(e.target.value))} />
              </Field>
              <Field label="SMTP username">
                <input className={inputClass} value={String(cfg["smtp_user"] ?? "")} onChange={(e) => setC("smtp_user", e.target.value)} />
              </Field>
              <Field label="SMTP password">
                <input type="password" className={inputClass} value={String(cfg["smtp_password"] ?? "")} onChange={(e) => setC("smtp_password", e.target.value)} />
              </Field>
              <div className="self-end">
                <Toggle checked={cfg["smtp_secure"] === true} onChange={(v) => setC("smtp_secure", v)} label="Use TLS/SSL (port 465)" />
              </div>
            </>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Toggle checked={cfg["notify_order_confirmation"] !== false} onChange={(v) => setC("notify_order_confirmation", v)} label="Order confirmation" />
          <Toggle checked={cfg["notify_payment_received"] !== false} onChange={(v) => setC("notify_payment_received", v)} label="Payment received" />
          <Toggle checked={cfg["notify_shipping_update"] !== false} onChange={(v) => setC("notify_shipping_update", v)} label="Shipping updates" />
          <Toggle checked={cfg["notify_admin_new_order"] !== false} onChange={(v) => setC("notify_admin_new_order", v)} label="Admin new-order alerts" />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Send a test email to">
              <input className={inputClass} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
          </div>
          <button
            onClick={() => runTest("email")}
            disabled={testing === "email"}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {testing === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test
          </button>
        </div>
      </section>

      {/* SMS */}
      <section className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">SMS notifications (Africa&apos;s Talking)</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Toggle checked={cfg["sms_enabled"] === true} onChange={(v) => setC("sms_enabled", v)} label="SMS sending enabled" />
          </div>
          <Field label="Username">
            <input className={inputClass} value={String(cfg["at_username"] ?? "")} onChange={(e) => setC("at_username", e.target.value)} />
          </Field>
          <Field label="API key">
            <input type="password" className={inputClass} value={String(cfg["at_api_key"] ?? "")} onChange={(e) => setC("at_api_key", e.target.value)} />
          </Field>
          <Field label="Sender ID / short code" hint="Leave blank to use the shared sender.">
            <input className={inputClass} value={String(cfg["at_sender_id"] ?? "")} onChange={(e) => setC("at_sender_id", e.target.value)} />
          </Field>
          <div className="self-end">
            <Toggle checked={cfg["at_sandbox"] !== false} onChange={(v) => setC("at_sandbox", v)} label="Sandbox mode" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Send a test SMS to">
              <input className={inputClass} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="254700000000" />
            </Field>
          </div>
          <button
            onClick={() => runTest("sms")}
            disabled={testing === "sms"}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {testing === "sms" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send test
          </button>
        </div>
      </section>

      <button
        onClick={saveSettings}
        disabled={savingCfg}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {savingCfg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save email &amp; SMS settings
      </button>
    </div>
  );
}
