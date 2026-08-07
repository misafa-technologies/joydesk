// Server-only password reset: mints a recovery link on the CURRENT domain and
// delivers it through the admin-configured SMTP/Resend sender.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderPasswordResetEmail } from "@/lib/email-templates";
import { loadIntegrationSettings, sendEmail } from "@/lib/notifications.server";

export async function sendCustomPasswordReset(
  email: string,
  origin: string,
): Promise<{ sent: boolean; fallback: boolean; reason?: string }> {
  const settings = await loadIntegrationSettings();
  // Admin has to opt in AND have email sending configured, otherwise the client
  // falls back to the built-in provider email so resets never silently break.
  if (!settings?.email_enabled || settings.custom_password_reset !== true) {
    return { sent: false, fallback: true, reason: "custom_reset_disabled" };
  }

  const redirectTo = `${origin}/reset-password`;
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error || !data?.properties?.hashed_token) {
    // Unknown email addresses land here too — stay generic for the caller.
    return { sent: false, fallback: false, reason: error?.message ?? "no_token" };
  }

  const link = `${origin}/reset-password?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&type=recovery`;

  const { data: store } = await supabaseAdmin
    .from("store_settings")
    .select("store_name")
    .limit(1)
    .maybeSingle();

  const { subject, html } = renderPasswordResetEmail({
    storeName: store?.store_name ?? "JoyDesk",
    link,
  });

  const res = await sendEmail({ to: email, subject, html, template: "password_reset" });
  return { sent: res.sent, fallback: !res.sent, reason: res.reason };
}
