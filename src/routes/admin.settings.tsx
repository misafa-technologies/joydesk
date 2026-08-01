import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [
    { title: "Store settings — JoyDesk Admin" },
    { name: "description", content: "Manage JoyDesk contact information, delivery fees and payment display details." },
    { property: "og:title", content: "Store settings — JoyDesk Admin" },
    { property: "og:description", content: "Manage JoyDesk store settings." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminSettings,
});

type Form = Record<string, string>;
function AdminSettings() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>({});
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "store-settings"], queryFn: async () => { const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle(); if (error) throw error; return data; } });
  useEffect(() => { if (data) setForm(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)]))); }, [data]);
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function save(e: React.FormEvent) { e.preventDefault(); setSaving(true); const payload = { store_name: form.store_name || "JoyDesk", tagline: form.tagline || "Comfort Meets Productivity", support_email: form.support_email || null, support_phone: form.support_phone || null, whatsapp_number: form.whatsapp_number || null, mpesa_paybill: form.mpesa_paybill || null, mpesa_account_name: form.mpesa_account_name || null, free_delivery_threshold: Number(form.free_delivery_threshold || 0), standard_delivery_fee: Number(form.standard_delivery_fee || 0), express_delivery_fee: Number(form.express_delivery_fee || 0) }; const result = data?.id ? await supabase.from("store_settings").update(payload).eq("id", data.id) : await supabase.from("store_settings").insert(payload); setSaving(false); if (result.error) return toast.error(result.error.message); qc.invalidateQueries({ queryKey: ["admin", "store-settings"] }); qc.invalidateQueries({ queryKey: ["store-settings"] }); toast.success("Store settings saved"); }
  if (isLoading) return <div className="grid h-64 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Store settings</h1><p className="mt-1 text-sm text-muted-foreground">Contact details, delivery pricing and customer-facing payment information.</p></div><form onSubmit={save} className="grid gap-4 rounded-md border border-border bg-background p-5 sm:grid-cols-2">{[["store_name","Store name"],["tagline","Tagline"],["support_email","Support email"],["support_phone","Support phone"],["whatsapp_number","WhatsApp number"],["mpesa_paybill","M-Pesa Paybill"],["mpesa_account_name","M-Pesa account name"],["free_delivery_threshold","Free delivery threshold"],["standard_delivery_fee","Standard delivery fee"],["express_delivery_fee","Express delivery fee"]].map(([key, label]) => <label key={key} className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><Input type={key.includes("fee") || key.includes("threshold") ? "number" : key.includes("email") ? "email" : "text"} value={form[key] ?? ""} maxLength={255} onChange={(e) => set(key, e.target.value)} /></label>)}<Button disabled={saving} className="w-fit sm:col-span-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save settings</Button></form></div>;
}