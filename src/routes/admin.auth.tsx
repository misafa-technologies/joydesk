import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Save, ShieldAlert } from "lucide-react";
import { useRoles } from "@/hooks/use-role";
import { useAuthSettings } from "@/hooks/use-auth-settings";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/auth")({
  head: () => ({
    meta: [
      { title: "Authentication settings — JoyDesk Admin" },
      { name: "description", content: "Configure which sign-in methods are available to JoyDesk customers." },
      { property: "og:title", content: "Authentication settings — JoyDesk Admin" },
      { property: "og:description", content: "Manage email, signup, Google and Apple sign-in for JoyDesk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAuthSettings,
});

function AdminAuthSettings() {
  const { isAdmin, loading: rolesLoading } = useRoles();
  const qc = useQueryClient();
  const { data, isLoading } = useAuthSettings();
  const [form, setForm] = useState({
    email_enabled: true,
    signup_enabled: true,
    google_enabled: false,
    apple_enabled: false,
    social_note: "",
    google_client_id: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        email_enabled: data.email_enabled,
        signup_enabled: data.signup_enabled,
        google_enabled: data.google_enabled,
        apple_enabled: data.apple_enabled,
        social_note: data.social_note ?? "",
        google_client_id: data.google_client_id ?? "",
      });
    }
  }, [data]);

  if (rolesLoading || isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">Access denied — admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authentication settings can only be changed by JoyDesk admins.
          </p>
          <Link
            to="/admin"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const allDisabled = !form.email_enabled && !form.google_enabled && !form.apple_enabled;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (allDisabled) {
      toast.error("At least one sign-in method must stay enabled, or customers will be locked out.");
      return;
    }
    setSaving(true);
    const payload = {
      email_enabled: form.email_enabled,
      signup_enabled: form.signup_enabled,
      google_enabled: form.google_enabled,
      apple_enabled: form.apple_enabled,
      social_note: form.social_note.trim() || null,
      google_client_id: form.google_client_id.trim() || null,
    };
    const result = data?.id
      ? await supabase.from("auth_settings").update(payload).eq("id", data.id)
      : await supabase.from("auth_settings").insert(payload);
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    qc.invalidateQueries({ queryKey: ["auth-settings"] });
    toast.success("Authentication settings saved");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Authentication settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which sign-in methods are available on the customer-facing auth page.
        </p>
      </div>

      <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Enabling Google or Apple sign-in here only turns them on in JoyDesk. You must also enable and configure
          those providers in your Supabase/backend authentication provider settings for them to actually work.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-md border border-border bg-background p-5">
        <ToggleRow
          label="Email & password sign-in"
          description="Let customers sign in with an email address and password."
          checked={form.email_enabled}
          onChange={(v) => setForm((f) => ({ ...f, email_enabled: v }))}
        />
        <ToggleRow
          label="Allow new signups"
          description="Show the 'Create account' option. Existing accounts can still sign in even if this is off."
          checked={form.signup_enabled}
          onChange={(v) => setForm((f) => ({ ...f, signup_enabled: v }))}
        />
        <ToggleRow
          label="Google sign-in"
          description="Show a 'Continue with Google' button on the auth page."
          checked={form.google_enabled}
          onChange={(v) => setForm((f) => ({ ...f, google_enabled: v }))}
        />
        <ToggleRow
          label="Apple sign-in"
          description="Show a 'Continue with Apple' button on the auth page."
          checked={form.apple_enabled}
          onChange={(v) => setForm((f) => ({ ...f, apple_enabled: v }))}
        />

        {form.google_enabled && (
          <label className="block pt-2">
            <span className="mb-1.5 block text-sm font-medium">Google OAuth Client ID (optional)</span>
            <input
              value={form.google_client_id}
              maxLength={255}
              placeholder="1234567890-abc123.apps.googleusercontent.com"
              onChange={(e) => setForm((f) => ({ ...f, google_client_id: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Paste your own Google Cloud OAuth Web Client ID to sign customers in directly with Google (no provider
              redirect). Add this site's domain to the client's Authorized JavaScript origins. Leave blank to use the
              standard redirect flow.
            </span>
          </label>
        )}

        <label className="block pt-2">
          <span className="mb-1.5 block text-sm font-medium">Social sign-in note (optional)</span>
          <Textarea
            value={form.social_note}
            maxLength={300}
            placeholder="e.g. Google sign-in is temporarily unavailable — please use email."
            onChange={(e) => setForm((f) => ({ ...f, social_note: e.target.value }))}
          />
          <span className="mt-1 block text-xs text-muted-foreground">Shown to customers on the sign-in page.</span>
        </label>

        {allDisabled && (
          <p className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            All sign-in methods are off — customers won't be able to log in. Enable at least one before saving.
          </p>
        )}

        <Button type="submit" disabled={saving || allDisabled} className="w-fit">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
