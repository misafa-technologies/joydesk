import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact us — JoyDesk" },
      { name: "description", content: "Get in touch with the JoyDesk team via phone, email or WhatsApp for support or bulk enquiries." },
      { property: "og:title", content: "Contact us — JoyDesk" },
      { property: "og:description", content: "Reach the JoyDesk team." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({
    queryKey: ["store-settings-contact"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    const whatsapp = (settings?.whatsapp_number ?? "254700000000").replace(/\D/g, "");
    const text = encodeURIComponent(
      `Hello ${settings?.store_name ?? "JoyDesk"}, my name is ${form.name} (${form.email}).\n\n${form.message}`,
    );
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
    toast.success("Message ready to send", { description: "We've opened WhatsApp with your message prefilled." });
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questions about an order, a product, or a bulk enquiry? We're happy to help.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
              <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Call us</h2>
                <p className="mt-1 text-sm text-muted-foreground">{settings?.support_phone ?? "+254 700 000 000"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">Email us</h2>
                <p className="mt-1 text-sm text-muted-foreground">{settings?.support_email ?? "support@joydesk.co.ke"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">WhatsApp</h2>
                <p className="mt-1 text-sm text-muted-foreground">{settings?.whatsapp_number ?? "+254 700 000 000"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="text-sm font-semibold">{settings?.store_name ?? "JoyDesk"} showroom</h2>
                <p className="mt-1 text-sm text-muted-foreground">Nairobi, Kenya</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div>
              <label className="text-sm font-medium">Full name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={80}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={120}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                maxLength={1000}
                rows={5}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2"
              />
              {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
            </div>
            <button className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Send via WhatsApp
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
