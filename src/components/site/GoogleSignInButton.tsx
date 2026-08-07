import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (res: { credential?: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

const SCRIPT_ID = "google-identity-services";

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google script failed to load"));
    document.head.appendChild(s);
  });
}

/**
 * Renders Google's own sign-in button using the store's Google Client ID and
 * exchanges the returned ID token for a session — no provider redirect needed.
 */
export function GoogleSignInButton({
  clientId,
  onSignedIn,
}: {
  clientId: string;
  onSignedIn: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          cancel_on_tap_outside: true,
          callback: async (res) => {
            if (!res.credential) return;
            const { error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: res.credential,
            });
            if (error) return toast.error(error.message);
            toast.success("Signed in with Google");
            onSignedIn();
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "rectangular",
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, onSignedIn]);

  if (failed) return null;
  return <div ref={ref} className="flex justify-center" aria-label="Continue with Google" />;
}
