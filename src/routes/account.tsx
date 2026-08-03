import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Heart, Loader2, MapPin, Package, Pencil, Plus, Printer, Save, Trash2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { COUNTY_NAMES, getSubCounties, getTowns } from "@/data/kenya-locations";
import { formatDateTime, formatKES, normalizeKenyanPhone } from "@/lib/format";
import { previewReceipt } from "@/lib/receipt";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My account — JoyDesk" },
      { name: "description", content: "Manage your JoyDesk profile, delivery addresses, orders and wishlist." },
      { property: "og:title", content: "My account — JoyDesk" },
      { property: "og:description", content: "Manage your JoyDesk customer account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

type Tab = "profile" | "addresses" | "orders" | "wishlist";
type AddressForm = {
  id?: string; label: string; recipient_name: string; phone: string; county: string;
  sub_county: string; town: string; street: string; notes: string; is_default: boolean;
};

const emptyAddress: AddressForm = {
  label: "Home", recipient_name: "", phone: "", county: "", sub_county: "", town: "",
  street: "", notes: "", is_default: false,
};

function AccountPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState({ full_name: "", phone: "", email: "", marketing_opt_in: false });
  const [address, setAddress] = useState<AddressForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/account" }, replace: true });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profileRes, addressesRes, ordersRes, wishlistRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user?.id ?? "").maybeSingle(),
        supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at"),
        supabase.from("orders").select("id, order_number, status, payment_status, total, created_at").order("created_at", { ascending: false }),
        supabase.from("wishlists").select("id", { count: "exact", head: true }),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (addressesRes.error) throw addressesRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (wishlistRes.error) throw wishlistRes.error;
      return { profile: profileRes.data, addresses: addressesRes.data ?? [], orders: ordersRes.data ?? [], wishlistCount: wishlistRes.count ?? 0 };
    },
  });

  useEffect(() => {
    if (!user || !data) return;
    setProfile({
      full_name: data.profile?.full_name ?? "",
      phone: data.profile?.phone ?? "",
      email: user.email ?? "",
      marketing_opt_in: data.profile?.marketing_opt_in ?? false,
    });
  }, [data, user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const phone = profile.phone ? normalizeKenyanPhone(profile.phone) : "";
    if (profile.phone && !phone) return toast.error("Enter a valid Kenyan phone number");
    if (!profile.full_name.trim()) return toast.error("Enter your full name");
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id, full_name: profile.full_name.trim(), phone: phone || null,
        marketing_opt_in: profile.marketing_opt_in,
      }, { onConflict: "user_id" });
      if (error) throw error;
      if (profile.email.trim() !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: profile.email.trim() });
        if (emailError) throw emailError;
        toast.success("Profile saved", { description: "Check your new email address to confirm the change." });
      } else toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["account"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save profile"); }
    finally { setSaving(false); }
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !address) return;
    const phone = normalizeKenyanPhone(address.phone);
    if (!phone) return toast.error("Enter a valid Kenyan phone number");
    if (!address.recipient_name.trim() || !address.county || !address.sub_county || !address.town || !address.street.trim()) {
      return toast.error("Complete every required address field");
    }
    setSaving(true);
    const payload = { user_id: user.id, label: address.label.trim() || "Address", recipient_name: address.recipient_name.trim(), phone,
      county: address.county, sub_county: address.sub_county, town: address.town, street: address.street.trim(),
      notes: address.notes.trim() || null, is_default: address.is_default };
    const result = address.id
      ? await supabase.from("addresses").update(payload).eq("id", address.id)
      : await supabase.from("addresses").insert(payload);
    setSaving(false);
    if (result.error) return toast.error(result.error.message);
    setAddress(null);
    qc.invalidateQueries({ queryKey: ["account"] });
    qc.invalidateQueries({ queryKey: ["checkout-addresses"] });
    toast.success("Address saved");
  }

  async function setDefault(id: string) {
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["account"] });
    qc.invalidateQueries({ queryKey: ["checkout-addresses"] });
    toast.success("Default shipping address updated");
  }

  async function removeAddress(id: string) {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["account"] });
    toast.success("Address removed");
  }

  async function handlePrintReceipt(order: { id: string; order_number: string; created_at: string; total: number; payment_status: string }) {
    setPrintingId(order.id);
    try {
      const [{ data: fullOrder, error: orderError }, { data: items, error: itemsError }, { data: settings }, { data: payment }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", order.id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", order.id),
        supabase.from("store_settings").select("*").limit(1).maybeSingle(),
        supabase
          .from("payments")
          .select("mpesa_receipt")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (orderError) throw orderError;
      if (itemsError) throw itemsError;
      if (!fullOrder) throw new Error("Order not found");
      previewReceipt(fullOrder, items ?? [], {
        storeName: settings?.store_name,
        tagline: settings?.tagline,
        supportPhone: settings?.support_phone,
        supportEmail: settings?.support_email,
        paybill: settings?.mpesa_paybill ?? "400200",
        receipt: payment?.mpesa_receipt,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load receipt");
    } finally {
      setPrintingId(null);
    }
  }

  if (loading || !user || isLoading) return <Shell><div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;

  const tabs = [
    { key: "profile" as const, label: "Profile", icon: UserRound },
    { key: "addresses" as const, label: "Addresses", icon: MapPin },
    { key: "orders" as const, label: "Orders", icon: Package },
    { key: "wishlist" as const, label: "Wishlist", icon: Heart },
  ];

  return (
    <Shell>
      <div className="mb-8"><p className="text-sm font-medium text-primary">Customer account</p><h1 className="mt-1 text-3xl font-bold">Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1></div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Account sections">
          {tabs.map((item) => <Button key={item.key} type="button" variant={tab === item.key ? "default" : "ghost"} className="justify-start" onClick={() => setTab(item.key)}><item.icon className="h-4 w-4" />{item.label}{item.key === "wishlist" && data?.wishlistCount ? ` (${data.wishlistCount})` : ""}</Button>)}
        </nav>
        <div className="min-w-0">
          {tab === "profile" && <section><h2 className="text-xl font-semibold">Profile details</h2><p className="mt-1 text-sm text-muted-foreground">Keep your delivery and account details current.</p>
            <form onSubmit={saveProfile} className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
              <Field label="Full name" value={profile.full_name} onChange={(v) => setProfile((p) => ({ ...p, full_name: v }))} required />
              <Field label="Phone" value={profile.phone} onChange={(v) => setProfile((p) => ({ ...p, phone: v }))} placeholder="07XX XXX XXX" />
              <div className="sm:col-span-2"><Field label="Email" type="email" value={profile.email} onChange={(v) => setProfile((p) => ({ ...p, email: v }))} required /></div>
              <label className="flex items-start gap-3 rounded-md border border-border p-4 text-sm sm:col-span-2"><input type="checkbox" checked={profile.marketing_opt_in} onChange={(e) => setProfile((p) => ({ ...p, marketing_opt_in: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-primary" /><span><strong className="block">Offers and workspace advice</strong><span className="text-muted-foreground">Receive occasional JoyDesk product news and promotions.</span></span></label>
              <Button disabled={saving} className="w-fit"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save profile"}</Button>
            </form></section>}

          {tab === "addresses" && <section><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Address book</h2><p className="mt-1 text-sm text-muted-foreground">Choose the address used first at checkout.</p></div><Button type="button" onClick={() => setAddress({ ...emptyAddress, recipient_name: profile.full_name, phone: profile.phone, is_default: !data?.addresses.length })}><Plus className="h-4 w-4" />Add address</Button></div>
            {address && <form onSubmit={saveAddress} className="mt-6 grid gap-4 rounded-md border border-border p-5 sm:grid-cols-2">
              <Field label="Label" value={address.label} onChange={(v) => setAddress((a) => a && ({ ...a, label: v }))} required />
              <Field label="Recipient name" value={address.recipient_name} onChange={(v) => setAddress((a) => a && ({ ...a, recipient_name: v }))} required />
              <Field label="Phone" value={address.phone} onChange={(v) => setAddress((a) => a && ({ ...a, phone: v }))} required />
              <SelectField label="County" value={address.county} options={COUNTY_NAMES} onChange={(v) => setAddress((a) => a && ({ ...a, county: v, sub_county: "", town: "" }))} />
              <SelectField label="Sub-county" value={address.sub_county} options={getSubCounties(address.county).map((item) => item.name)} onChange={(v) => setAddress((a) => a && ({ ...a, sub_county: v, town: "" }))} />
              <SelectField label="Town / Ward" value={address.town} options={getTowns(address.county, address.sub_county)} onChange={(v) => setAddress((a) => a && ({ ...a, town: v }))} />
              <div className="sm:col-span-2"><Field label="Street / Estate / House" value={address.street} onChange={(v) => setAddress((a) => a && ({ ...a, street: v }))} required /></div>
              <div className="sm:col-span-2"><Field label="Delivery notes" value={address.notes} onChange={(v) => setAddress((a) => a && ({ ...a, notes: v }))} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={address.is_default} onChange={(e) => setAddress((a) => a && ({ ...a, is_default: e.target.checked }))} className="h-4 w-4 accent-primary" />Use as default shipping address</label>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setAddress(null)}>Cancel</Button><Button disabled={saving}>{saving ? "Saving…" : "Save address"}</Button></div>
            </form>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">{data?.addresses.map((item) => <article key={item.id} className="rounded-md border border-border p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{item.label || "Address"}</h3>{item.is_default && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">Default</span>}</div><p className="mt-2 text-sm">{item.recipient_name} · {item.phone}</p><p className="mt-1 text-sm text-muted-foreground">{[item.street, item.town, item.sub_county, item.county].filter(Boolean).join(", ")}</p></div><div className="flex"><Button type="button" size="icon" variant="ghost" aria-label="Edit address" onClick={() => setAddress({ id: item.id, label: item.label ?? "Address", recipient_name: item.recipient_name, phone: item.phone, county: item.county, sub_county: item.sub_county ?? "", town: item.town ?? "", street: item.street ?? "", notes: item.notes ?? "", is_default: item.is_default })}><Pencil className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Delete address" onClick={() => removeAddress(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div>{!item.is_default && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setDefault(item.id)}>Make default</Button>}</article>)}{!data?.addresses.length && !address && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}</div>
          </section>}

          {tab === "orders" && <section><h2 className="text-xl font-semibold">Order history</h2><p className="mt-1 text-sm text-muted-foreground">Payment, fulfilment, receipts and delivery progress.</p><div className="mt-6 divide-y divide-border rounded-md border border-border">{data?.orders.map((order) => <article key={order.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{order.order_number}</strong><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{order.status}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">Payment {order.payment_status}</span></div><p className="mt-1 text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p></div><strong>{formatKES(order.total)}</strong><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={printingId === order.id} onClick={() => handlePrintReceipt(order)}>{printingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}Receipt</Button>{order.payment_status !== "paid" && <Button asChild size="sm"><Link to="/pay/$orderNumber" params={{ orderNumber: order.order_number }}><CreditCard className="h-4 w-4" />Complete payment</Link></Button>}<Button asChild variant="outline" size="sm"><Link to="/track" search={{ order: order.order_number }}>Track</Link></Button></div></article>)}{!data?.orders.length && <p className="p-6 text-sm text-muted-foreground">You have not placed an order yet.</p>}</div></section>}
          {tab === "wishlist" && <section><h2 className="text-xl font-semibold">Wishlist</h2><p className="mt-1 text-sm text-muted-foreground">You have {data?.wishlistCount ?? 0} saved item{data?.wishlistCount === 1 ? "" : "s"}.</p><Button asChild className="mt-6"><Link to="/wishlist"><Heart className="h-4 w-4" />Open wishlist</Link></Button></section>}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="flex min-h-screen flex-col bg-background"><Header /><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">{children}</main><Footer /></div>; }
function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><input type={type} value={value} required={required} placeholder={placeholder} maxLength={255} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><select value={value} required onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }