import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Request a bulk quotation — JoyDesk" },
      { name: "description", content: "Fitting out an office? Request a corporate bulk quotation for chairs, desks, laptops and monitors from JoyDesk." },
      { property: "og:title", content: "Corporate bulk quotation — JoyDesk" },
      { property: "og:description", content: "Request a bulk quotation for your office." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: QuotePage,
});

const schema = z.object({
  company: z.string().trim().min(2, "Company name required").max(120),
  contactPerson: z.string().trim().min(2, "Contact person required").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(20),
  product: z.string().trim().min(2, "Tell us what you need").max(200),
  quantity: z.string().trim().min(1, "Enter a quantity").max(20),
  budget: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;

const initial: Form = { company: "", contactPerson: "", email: "", phone: "", product: "", quantity: "", budget: "", notes: "" };

function QuotePage() {
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({
    queryKey: ["store-settings-quote"],
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
    const whatsapp = (settings?.whatsapp_number ?? "254700000000").replace(/\D/g, "");
    const text = encodeURIComponent(
      [
        `Bulk quotation request — ${form.company}`,
        `Contact: ${form.contactPerson} (${form.phone}, ${form.email})`,
        `Product interest: ${form.product}`,
        `Quantity: ${form.quantity}`,
        form.budget ? `Budget: ${form.budget}` : "",
        form.notes ? `Notes: ${form.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
    toast.success("Quote request ready", { description: "We've opened WhatsApp with your request prefilled." });
    setForm(initial);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Corporate bulk quotation</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Fitting out an office or a whole floor? Tell us what you need and our team
          will send a tailored quote within one business day.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Company name</label>
            <input value={form.company} onChange={(e) => set("company", e.target.value)} maxLength={120}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
            {errors.company && <p className="mt-1 text-xs text-destructive">{errors.company}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Contact person</label>
            <input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} maxLength={80}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
            {errors.contactPerson && <p className="mt-1 text-xs text-destructive">{errors.contactPerson}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Product interest</label>
            <input value={form.product} onChange={(e) => set("product", e.target.value)} maxLength={200}
              placeholder="e.g. Ergonomic chairs, standing desks, laptops…"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
            {errors.product && <p className="mt-1 text-xs text-destructive">{errors.product}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Quantity</label>
            <input value={form.quantity} onChange={(e) => set("quantity", e.target.value)} maxLength={20}
              placeholder="e.g. 50 units"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
            {errors.quantity && <p className="mt-1 text-xs text-destructive">{errors.quantity}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Budget (optional)</label>
            <input value={form.budget} onChange={(e) => set("budget", e.target.value)} maxLength={50}
              placeholder="e.g. KSh 1,000,000"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Additional notes (optional)</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} rows={4}
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2" />
          </div>
          <button className="sm:col-span-2 w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Request quotation via WhatsApp
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
