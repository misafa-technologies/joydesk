import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/shipping")({
  head: () => ({ meta: [
    { title: "Shipping — JoyDesk Admin" },
    { name: "description", content: "Create and update JoyDesk order shipments and tracking details." },
    { property: "og:title", content: "Shipping — JoyDesk Admin" },
    { property: "og:description", content: "Manage JoyDesk order fulfilment." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminShipping,
});

const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const COURIER_REQUIRED_STATUSES = new Set(["shipped", "delivered"]);

function AdminShipping() {
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState("");
  const [form, setForm] = useState({ tracking_number: "", courier_id: "", status: "processing", current_location: "", estimated_delivery: "" });
  const [saving, setSaving] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shipping"],
    queryFn: async () => {
      const [orders, shipments, couriers] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, county, town, status").order("created_at", { ascending: false }),
        supabase.from("shipments").select("*").order("updated_at", { ascending: false }),
        supabase.from("couriers").select("*").order("name", { ascending: true }),
      ]);
      if (orders.error) throw orders.error;
      if (shipments.error) throw shipments.error;
      if (couriers.error) throw couriers.error;
      return { orders: orders.data ?? [], shipments: shipments.data ?? [], couriers: couriers.data ?? [] };
    },
  });

  const selectedOrderRow = data?.orders.find((o) => o.id === selectedOrder);

  const { list: courierOptions, filteredByCounty } = useMemo(() => {
    const active = (data?.couriers ?? []).filter((c) => c.is_active);
    const county = selectedOrderRow?.county;
    if (county) {
      const matches = active.filter((c) => (c.counties ?? []).length === 0 || (c.counties ?? []).includes(county));
      if (matches.length) return { list: matches, filteredByCounty: true };
    }
    return { list: active, filteredByCounty: false };
  }, [data?.couriers, selectedOrderRow]);

  function chooseOrder(id: string) {
    setSelectedOrder(id);
    const shipment = data?.shipments.find((item) => item.order_id === id);
    setForm(shipment ? {
      tracking_number: shipment.tracking_number, courier_id: shipment.courier_id ?? "", status: shipment.status,
      current_location: shipment.current_location ?? "", estimated_delivery: shipment.estimated_delivery ?? "",
    } : { tracking_number: `JDTRK-${Date.now().toString(36).toUpperCase()}`, courier_id: "", status: "processing", current_location: "JoyDesk warehouse", estimated_delivery: "" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder || !form.tracking_number.trim()) return toast.error("Choose an order and enter a tracking number");
    if (COURIER_REQUIRED_STATUSES.has(form.status) && !form.courier_id) {
      return toast.error("Select a courier before marking this shipment as shipped or delivered");
    }
    setSaving(true);
    const existing = data?.shipments.find((item) => item.order_id === selectedOrder);
    const courier = data?.couriers.find((c) => c.id === form.courier_id);
    const history = [
      ...(Array.isArray(existing?.history) ? existing.history : []),
      { status: form.status, location: form.current_location.trim(), courier: courier?.name ?? null, at: new Date().toISOString() },
    ];
    const payload = {
      order_id: selectedOrder, tracking_number: form.tracking_number.trim(),
      courier_id: form.courier_id || null, courier: courier?.name ?? null,
      status: form.status, current_location: form.current_location.trim() || null, estimated_delivery: form.estimated_delivery || null, history,
    };
    const shipmentResult = existing
      ? await supabase.from("shipments").update(payload).eq("id", existing.id)
      : await supabase.from("shipments").insert(payload);
    if (!shipmentResult.error) await supabase.from("orders").update({ status: form.status }).eq("id", selectedOrder);
    setSaving(false);
    if (shipmentResult.error) return toast.error(shipmentResult.error.message);
    qc.invalidateQueries({ queryKey: ["admin", "shipping"] });
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    toast.success("Shipment updated");
  }

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Shipping</h1><p className="mt-1 text-sm text-muted-foreground">Assign tracking details and keep customers informed.</p></div>
    <form onSubmit={save} className="grid gap-4 rounded-md border border-border bg-background p-5 sm:grid-cols-2">
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Order</span><select value={selectedOrder} required onChange={(e) => chooseOrder(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select an order</option>{data?.orders.map((order) => <option key={order.id} value={order.id}>{order.order_number} · {order.customer_name} · {order.town ?? order.county ?? "Pickup"}</option>)}</select></label>
      <Field label="Tracking number" value={form.tracking_number} onChange={(tracking_number) => setForm((value) => ({ ...value, tracking_number }))} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Courier {COURIER_REQUIRED_STATUSES.has(form.status) && <span className="text-destructive">*</span>}
        </span>
        <select value={form.courier_id} onChange={(e) => setForm((value) => ({ ...value, courier_id: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select a courier</option>
          {courierOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {selectedOrderRow?.county && (
          <span className="mt-1 block text-xs text-muted-foreground">
            {filteredByCounty ? `Showing couriers covering ${selectedOrderRow.county}.` : `No couriers restricted to ${selectedOrderRow.county} — showing all active couriers.`}
          </span>
        )}
      </label>
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Status</span><select value={form.status} onChange={(e) => setForm((value) => ({ ...value, status: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
      <Field label="Current location" value={form.current_location} onChange={(current_location) => setForm((value) => ({ ...value, current_location }))} />
      <label className="block"><span className="mb-1.5 block text-sm font-medium">Estimated delivery</span><Input type="date" value={form.estimated_delivery} onChange={(e) => setForm((value) => ({ ...value, estimated_delivery: e.target.value }))} /></label>
      <Button disabled={saving || isLoading} className="w-fit sm:col-span-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}Save shipment</Button>
    </form>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span><Input value={value} maxLength={120} onChange={(e) => onChange(e.target.value)} /></label>; }
