import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns & after-sales support — JoyDesk" },
      { name: "description", content: "JoyDesk returns policy, warranty claims and after-sales support. Apply for a return or replacement online and track your claim." },
      { property: "og:title", content: "Returns & after-sales support — JoyDesk" },
      { property: "og:description", content: "Apply for a return, replacement or warranty repair on your JoyDesk order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReturnsPage,
});

const schema = z.object({
  orderNumber: z.string().trim().min(4, "Enter your order number").max(40),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(20),
  email: z.string().trim().email("Enter a valid email").max(120),
  item: z.string().trim().min(2, "Which item is affected?").max(160),
  reason: z.string().trim().min(1, "Select a reason"),
  resolution: z.string().trim().min(1, "Select a preferred resolution"),
  details: z.string().trim().min(10, "Describe the issue (min 10 characters)").max(1000),
});

type Form = z.infer<typeof schema>;

const REASONS = ["Damaged on arrival", "Wrong item delivered", "Faulty / not working", "Missing parts", "Changed my mind (unused)", "Warranty repair"];
const RESOLUTIONS = ["Replacement", "Repair under warranty", "Refund", "Store credit"];

const initial: Form = { orderNumber: "", name: "", phone: "", email: "", item: "", reason: "", resolution: "", details: "" };

const POLICY = [
  { title: "7-day change of mind", body: "Unused items in original packaging can be returned within 7 days of delivery. A restocking and collection fee may apply." },
  { title: "30-day faults", body: "Anything faulty, damaged in transit or incorrectly supplied is replaced or refunded in full within 30 days." },
  { title: "2-year warranty", body: "Furniture frames, gas lifts and electronics carry a 2-year warranty covering manufacturing defects." },
  { title: "Not covered", body: "Accidental damage, misuse, normal wear on fabrics and casters, and items altered after delivery." },
];

function ReturnsPage() {
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["store-settings"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
    const whatsapp = (settings?.whatsapp_number ?? "").replace(/\D/g, "");
    const text = encodeURIComponent(
      [
        `Return / after-sales request — ${form.orderNumber}`,
        `Customer: ${form.name} (${form.phone}, ${form.email})`,
        `Item: ${form.item}`,
        `Reason: ${form.reason}`,
        `Preferred resolution: ${form.resolution}`,
        `Details: ${form.details}`,
      ].join("\n"),
    );
    if (whatsapp) window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank", "noopener,noreferrer");
    setSubmitted(true);
    toast.success("Return request prepared", {
      description: whatsapp ? "We've opened WhatsApp with your claim prefilled." : "Our team will contact you shortly.",
    });
  }

  const field = "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Returns & after-sales</h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Something not right? Tell us what happened and we'll arrange a replacement, repair or refund.
          Most claims are resolved within three working days.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {POLICY.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">{p.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </section>

        {submitted ? (
          <div className="mt-10 rounded-xl border border-border bg-muted/40 p-6">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-lg font-semibold">Request received</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reference your order number <strong>{form.orderNumber}</strong> in any follow-up.
              {settings?.support_email ? ` You can also email ${settings.support_email}.` : ""}
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm(initial); }}
              className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
            <h2 className="text-lg font-semibold sm:col-span-2">Return application</h2>
            <div>
              <label className="text-sm font-medium" htmlFor="rn-order">Order number</label>
              <input id="rn-order" value={form.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} maxLength={40} placeholder="JD-XXXXXX" className={field} />
              {errors.orderNumber && <p className="mt-1 text-xs text-destructive">{errors.orderNumber}</p>}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="rn-item">Item affected</label>
              <input id="rn-item" value={form.item} onChange={(e) => set("item", e.target.value)} maxLength={160} placeholder="e.g. Ergo Pro Mesh Chair" className={field} />
              {errors.item && <p className="mt-1 text-xs text-destructive">{errors.item}</p>}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="rn-name">Full name</label>
              <input id="rn-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={field} />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="rn-phone">Phone</label>
              <input id="rn-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} className={field} />
              {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="rn-email">Email</label>
              <input id="rn-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} className={field} />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="rn-reason">Reason</label>
              <select id="rn-reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} className={field}>
                <option value="">Select a reason</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.reason && <p className="mt-1 text-xs text-destructive">{errors.reason}</p>}
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="rn-res">Preferred resolution</label>
              <select id="rn-res" value={form.resolution} onChange={(e) => set("resolution", e.target.value)} className={field}>
                <option value="">Select an outcome</option>
                {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {errors.resolution && <p className="mt-1 text-xs text-destructive">{errors.resolution}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="rn-details">What happened?</label>
              <textarea id="rn-details" value={form.details} onChange={(e) => set("details", e.target.value)} maxLength={1000} rows={4} className={field} />
              {errors.details && <p className="mt-1 text-xs text-destructive">{errors.details}</p>}
            </div>
            <button className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:col-span-2">
              Submit return request
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
