import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "joydesk-install-dismissed";

/**
 * Android/Chrome "add to home screen" invitation. Shown on the first visit that
 * the browser reports the app as installable, and never again once dismissed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return dismiss();
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install the JoyDesk app"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg" loading="lazy" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Add JoyDesk to your home screen</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Faster shopping, order tracking and receipts — straight from your phone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" /> Install
            </button>
            <button onClick={dismiss} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              Not now
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss install prompt" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
