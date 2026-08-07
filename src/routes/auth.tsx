import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useAuthSettings } from "@/hooks/use-auth-settings";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { GoogleSignInButton } from "@/components/site/GoogleSignInButton";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — JoyDesk" },
      { name: "description", content: "Access your JoyDesk account to track orders, save addresses and manage your wishlist." },
      { property: "og:title", content: "Sign in — JoyDesk" },
      { property: "og:description", content: "Access your JoyDesk account to track orders and manage your wishlist." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") ? s.redirect : undefined,
  }),
  component: AuthPage,
});

async function signInWithOAuth(provider: "google" | "apple", redirect?: string) {
  const redirectUri = redirect ? `${window.location.origin}${redirect}` : window.location.origin;
  try {
    const mod = await import("@/integrations/lovable");
    const lovable = (mod as { lovable?: { auth?: { signInWithOAuth?: (p: string, o: { redirect_uri: string }) => Promise<unknown> } } }).lovable;
    if (lovable?.auth?.signInWithOAuth) {
      await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
      return;
    }
  } catch {
    // module not present, fall back below
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUri } });
  if (error) throw error;
}

function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const { user, loading } = useAuth();
  const { data: settings, isLoading: settingsLoading } = useAuthSettings();

  useEffect(() => {
    if (!loading && user) navigate({ to: redirect ?? "/account", replace: true });
  }, [user, loading, navigate, redirect]);

  const emailEnabled = settings?.email_enabled ?? true;
  const signupEnabled = settings?.signup_enabled ?? true;
  const googleEnabled = settings?.google_enabled ?? false;
  const googleClientId = settings?.google_client_id?.trim() || "";
  const appleEnabled = settings?.apple_enabled ?? false;
  const socialNote = settings?.social_note;
  const noMethodEnabled = !settingsLoading && !emailEnabled && !googleEnabled && !appleEnabled;

  useEffect(() => {
    if (mode === "register" && !signupEnabled) setMode("login");
  }, [mode, signupEnabled]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email", { description: "Confirm your email address, then sign in to JoyDesk." });
          setMode("login");
          return;
        }
        toast.success("Account created");
      }
      navigate({ to: redirect ?? "/account", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setBusy(true);
    try {
      await signInWithOAuth(provider, redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight">
          {mode === "login" ? "Sign in to JoyDesk" : "Create your JoyDesk account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login"
            ? "Track orders, save addresses and access your wishlist."
            : "It only takes a moment — comfort meets productivity."}
        </p>

        {settingsLoading ? (
          <div className="mt-8 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading" />
          </div>
        ) : noMethodEnabled ? (
          <p className="mt-8 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Sign-in is temporarily unavailable. Please check back later.
          </p>
        ) : (
          <>
            {emailEnabled && (
              <form onSubmit={submit} className="mt-8 space-y-4">
                {mode === "register" && (
                  <>
                    <Field label="Full name" value={fullName} onChange={setFullName} required />
                    <Field label="Phone" value={phone} onChange={setPhone} placeholder="07XX XXX XXX" />
                  </>
                )}
                <Field label="Email" type="email" value={email} onChange={setEmail} required />
                <Field label="Password" type="password" value={password} onChange={setPassword} required />

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>
            )}

            {(googleEnabled || appleEnabled) && (
              <div className={emailEnabled ? "mt-6" : "mt-8"}>
                {emailEnabled && (
                  <div className="relative flex items-center py-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="px-3 text-xs uppercase tracking-wide text-muted-foreground">or continue with</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="space-y-3">
                  {googleEnabled && googleClientId ? (
                    <GoogleSignInButton
                      clientId={googleClientId}
                      onSignedIn={() => navigate({ to: redirect ?? "/account", replace: true })}
                    />
                  ) : null}
                  {googleEnabled && !googleClientId && (
                    <button
                      type="button"
                      onClick={() => handleOAuth("google")}
                      disabled={busy}
                      aria-label="Continue with Google"
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      Continue with Google
                    </button>
                  )}
                  {appleEnabled && (
                    <button
                      type="button"
                      onClick={() => handleOAuth("apple")}
                      disabled={busy}
                      aria-label="Continue with Apple"
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                    >
                      <AppleIcon className="h-4 w-4" />
                      Continue with Apple
                    </button>
                  )}
                </div>
              </div>
            )}

            {socialNote && (
              <p className="mt-4 text-center text-xs text-muted-foreground">{socialNote}</p>
            )}

            {emailEnabled && (
              <div className="mt-6 flex items-center justify-between text-sm">
                {signupEnabled ? (
                  <button className="text-primary hover:underline" onClick={() => setMode(mode === "login" ? "register" : "login")}>
                    {mode === "login" ? "Create an account" : "I already have an account"}
                  </button>
                ) : (
                  <span />
                )}
                <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        maxLength={255}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
      />
    </label>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 11.5S6.9 20.8 12 20.8c6.9 0 9.3-4.8 9.3-7.3 0-.5-.05-.9-.13-1.3H12z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.9c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.9-.8-1.5 0-2.9.9-3.6 2.2-1.6 2.7-.4 6.7 1.1 8.9.7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1.1 2.7-2.2.8-1.2 1.2-2.5 1.2-2.5-.1 0-2.5-1-2.5-3.6zM14 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.6.9.1 2-.5 2.6-1.2z" />
    </svg>
  );
}
