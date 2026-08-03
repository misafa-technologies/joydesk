import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Minus, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Msg = { from: "bot" | "user"; text: string };

const QUICK_REPLIES = [
  "Track my order",
  "Delivery cost & timelines",
  "Bulk / corporate quote",
  "M-Pesa payment help",
];

const ANSWERS: Record<string, string> = {
  "Track my order":
    "Head to the Track page and enter your order number (it looks like JD-XXXXXX). You'll see live courier and delivery updates there.",
  "Delivery cost & timelines":
    "We deliver countrywide. Nairobi orders usually arrive in 1–2 days, upcountry 2–4 days. Delivery is free above our threshold — the exact fee is shown at checkout.",
  "Bulk / corporate quote":
    "Use the Request Quotation page and we'll send a tailored corporate offer, usually within one working day.",
  "M-Pesa payment help":
    "Pay with M-Pesa Express at checkout — approve the STK prompt on your phone. If it fails, open the order and tap “Complete payment” to retry, or pay via Paybill using your order number as the account.",
};

/** Minimizable support widget with quick answers and a WhatsApp handoff. */
export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi 👋 I'm the JoyDesk assistant. How can we help with your workspace today?" },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("store_name, whatsapp_number, support_phone").limit(1).maybeSingle();
      return data;
    },
  });
  const whatsapp = (settings?.whatsapp_number ?? "").replace(/\D/g, "");

  useEffect(() => {
    if (open && !minimized) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized]);

  function reply(text: string) {
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    const answer =
      ANSWERS[clean] ??
      "Thanks! A JoyDesk specialist will pick this up. For an instant response, tap “Chat on WhatsApp” below.";
    setMessages((m) => [...m, { from: "user", text: clean }, { from: "bot", text: answer }]);
    setDraft("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setMinimized(false); }}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      <header className="flex items-center justify-between gap-2 bg-primary px-4 py-3 text-primary-foreground">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{settings?.store_name ?? "JoyDesk"} support</p>
          <p className="text-xs text-primary-foreground/75">Typically replies in a few minutes</p>
        </div>
        <div className="flex shrink-0">
          <button type="button" aria-label={minimized ? "Expand chat" : "Minimize chat"} onClick={() => setMinimized((m) => !m)} className="rounded p-1 hover:bg-primary-foreground/15">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-primary-foreground/15">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!minimized && (
        <>
          <div className="max-h-72 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "bot" ? "bg-muted text-foreground" : "ml-auto bg-primary text-primary-foreground"}`}
              >
                {m.text}
              </p>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
            {QUICK_REPLIES.map((q) => (
              <button key={q} type="button" onClick={() => reply(q)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); reply(draft); }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button type="submit" size="icon" aria-label="Send message"><Send className="h-4 w-4" /></Button>
          </form>

          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-accent px-4 py-2.5 text-center text-sm font-semibold text-accent-foreground hover:opacity-90"
            >
              Chat on WhatsApp
            </a>
          )}
        </>
      )}
    </div>
  );
}
