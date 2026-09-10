import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Check, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/lib/format";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { imageSrc } from "@/lib/media";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Request a bulk quotation — JoyDesk" },
      { name: "description", content: "Fitting out an office? Select the products you need or describe your own, and request a corporate bulk quotation from JoyDesk." },
      { property: "og:title", content: "Corporate bulk quotation — JoyDesk" },
      { property: "og:description", content: "Select products or describe your own and request a bulk quotation for your office." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotePage,
});

const schema = z.object({
  company: z.string().trim().min(2, "Company name required").max(120),
  contactPerson: z.string().trim().min(2, "Contact person required").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z.string().trim().min(9, "Enter a valid phone number").max(20),
  otherItems: z.string().trim().max(1000).optional().or(z.literal("")),
  quantity: z.string().trim().max(40).optional().or(z.literal("")),
  budget: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

type Form = z.infer<typeof schema>;

const initial: Form = { company: "", contactPerson: "", email: "", phone: "", otherItems: "", quantity: "", budget: "", notes: "" };

const inputCls =
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none ring-primary/30 focus:ring-2";

function QuotePage() {
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["store-settings-quote"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const { data: products, isPending: productsLoading } = useQuery({
    queryKey: ["quote-products"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, images, categories(name)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products ?? [];
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const selectedList = useMemo(
    () =>
      Object.entries(picked)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const p = (products ?? []).find((x) => x.id === id);
          return { id, name: p?.name ?? "Product", unit_price: Number(p?.price ?? 0), quantity: qty };
        }),
    [picked, products],
  );

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggle(id: string) {
    setPicked((p) => (p[id] ? Object.fromEntries(Object.entries(p).filter(([k]) => k !== id)) : { ...p, [id]: 10 }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      return;
    }
    if (!selectedList.length && !form.otherItems?.trim()) {
      setErrors({ otherItems: "Select at least one product, or describe what you need." });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.from("quote_requests").insert({
        company: form.company.trim(),
        contact_person: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        selected_products: selectedList,
        other_items: form.otherItems?.trim() || null,
        quantity: form.quantity?.trim() || null,
        budget: form.budget?.trim() || null,
        notes: form.notes?.trim() || null,
      });
      if (error) throw error;

      const whatsapp = (settings?.whatsapp_number ?? "254700000000").replace(/\D/g, "");
      const text = encodeURIComponent(
        [
          `Bulk quotation request — ${form.company}`,
          `Contact: ${form.contactPerson} (${form.phone}, ${form.email})`,
          selectedList.length ? `Products:\n${selectedList.map((s) => `• ${s.name} × ${s.quantity}`).join("\n")}` : "",
          form.otherItems ? `Other items: ${form.otherItems}` : "",
          form.quantity ? `Overall quantity: ${form.quantity}` : "",
          form.budget ? `Budget: ${form.budget}` : "",
          form.notes ? `Notes: ${form.notes}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      window.open(`https://wa.me/${whatsapp}?text=${text}`, "_blank");
      toast.success("Quotation request sent", { description: "Our team has it in the dashboard and will reply within one business day." });
      setForm(initial);
      setPicked({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Corporate bulk quotation</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Fitting out an office or a whole floor? Pick the products you want from our catalogue — or describe anything
          that isn't listed — and our team will send a tailored quote within one business day.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium" htmlFor="q-company">Company name</label>
            <input id="q-company" value={form.company} onChange={(e) => set("company", e.target.value)} maxLength={120} className={inputCls} />
            {errors.company && <p className="mt-1 text-xs text-destructive">{errors.company}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="q-person">Contact person</label>
            <input id="q-person" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} maxLength={80} className={inputCls} />
            {errors.contactPerson && <p className="mt-1 text-xs text-destructive">{errors.contactPerson}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="q-email">Email</label>
            <input id="q-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={120} className={inputCls} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="q-phone">Phone</label>
            <input id="q-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={20} className={inputCls} />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
          </div>

          {/* PRODUCT SELECTION */}
          <div className="sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium">Select products</label>
              <span className="text-xs text-muted-foreground">{selectedList.length} selected</span>
            </div>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the catalogue…"
                maxLength={80}
                className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {productsLoading ? (
                <div className="flex h-24 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : !visible.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No matching products — describe what you need below instead.
                </p>
              ) : (
                visible.map((p) => {
                  const active = !!picked[p.id];
                  const image = imageSrc(Array.isArray(p.images) ? (p.images[0] as string | undefined) : undefined);
                  return (
                    <div key={p.id} className={`flex items-center gap-3 rounded-md border p-2 transition-colors ${active ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"}`}>
                      <button
                        type="button"
                        onClick={() => toggle(p.id)}
                        aria-pressed={active}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${active ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                          {active && <Check className="h-3.5 w-3.5" />}
                        </span>
                        {image && <img src={image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block text-xs text-muted-foreground">{formatKES(p.price)}</span>
                        </span>
                      </button>
                      {active && (
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          aria-label={`Quantity for ${p.name}`}
                          value={picked[p.id]}
                          onChange={(e) => setPicked((s) => ({ ...s, [p.id]: Math.max(1, Number(e.target.value) || 1) }))}
                          className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="q-other">Not listed? Describe what you need</label>
            <textarea
              id="q-other"
              value={form.otherItems}
              onChange={(e) => set("otherItems", e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="e.g. 40 custom 1.6m workstations in oak, boardroom table for 12…"
              className={inputCls}
            />
            {errors.otherItems && <p className="mt-1 text-xs text-destructive">{errors.otherItems}</p>}
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="q-qty">Overall quantity (optional)</label>
            <input id="q-qty" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} maxLength={40} placeholder="e.g. 50 units" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="q-budget">Budget (optional)</label>
            <input id="q-budget" value={form.budget} onChange={(e) => set("budget", e.target.value)} maxLength={50} placeholder="e.g. KSh 1,000,000" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="q-notes">Additional notes (optional)</label>
            <textarea id="q-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={1000} rows={4} className={inputCls} />
          </div>
          <button disabled={busy} className="sm:col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send quotation request
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
