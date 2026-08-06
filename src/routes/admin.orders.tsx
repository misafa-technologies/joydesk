import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDateTime } from "@/lib/format";
import { previewDeliveryNote, type DeliveryNoteData } from "@/lib/delivery-note";
import { setOrderPaymentStatus } from "@/lib/payment-status.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Eye, Printer, Lock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — JoyDesk Admin" },
      { name: "description", content: "View and manage customer orders, status and payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrders,
});

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

function AdminOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [printing, setPrinting] = useState(false);
  const [payChange, setPayChange] = useState<{ order: Order; next: string } | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: items } = useQuery({
    queryKey: ["admin", "order_items", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", selected!.id);
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  const filtered = useMemo(() => {
    return (orders ?? []).filter((o) => {
      const matchesStatus = status === "all" || o.status === status;
      const matchesPayment = paymentStatus === "all" || o.payment_status === paymentStatus;
      const matchesSearch =
        !search.trim() ||
        o.order_number.toLowerCase().includes(search.trim().toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.trim().toLowerCase());
      return matchesStatus && matchesPayment && matchesSearch;
    });
  }, [orders, status, paymentStatus, search]);

  const { data: couriers } = useQuery({
    queryKey: ["admin", "couriers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("couriers").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: shipment } = useQuery({
    queryKey: ["admin", "shipment", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("shipments").select("*").eq("order_id", selected!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const pairCourier = useMutation({
    mutationFn: async ({ order, courierId }: { order: Order; courierId: string }) => {
      const courier = couriers?.find((c) => c.id === courierId);
      if (shipment) {
        const { error } = await supabase
          .from("shipments")
          .update({ courier_id: courierId, courier: courier?.name ?? null })
          .eq("id", shipment.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("shipments").insert({
        order_id: order.id,
        tracking_number: `JDTRK-${Date.now().toString(36).toUpperCase()}`,
        courier_id: courierId,
        courier: courier?.name ?? null,
        status: order.status === "pending" ? "processing" : order.status,
        current_location: "JoyDesk warehouse",
        history: [{ status: "processing", location: "JoyDesk warehouse", courier: courier?.name ?? null, at: new Date().toISOString() }],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Courier paired with this order");
      queryClient.invalidateQueries({ queryKey: ["admin", "shipment"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "shipping"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Order> }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const { data: branding } = useQuery({
    queryKey: ["admin", "store-branding"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("store_name, tagline, support_phone, support_email, logo_url")
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const checkedIds = useMemo(() => Object.keys(checked).filter((id) => checked[id]), [checked]);

  /** Builds and opens printable A4 delivery notes for the given orders. */
  async function printDeliveryNotes(list: Order[]) {
    if (!list.length) return;
    setPrinting(true);
    try {
      const ids = list.map((o) => o.id);
      const [itemsRes, shipRes] = await Promise.all([
        supabase.from("order_items").select("order_id, product_name, quantity, unit_price").in("order_id", ids),
        supabase.from("shipments").select("order_id, tracking_number, courier, courier_contact").in("order_id", ids),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (shipRes.error) throw shipRes.error;

      const notes: DeliveryNoteData[] = list.map((order) => ({
        order,
        items: (itemsRes.data ?? [])
          .filter((i) => i.order_id === order.id)
          .map((i) => ({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })),
        shipment: (shipRes.data ?? []).find((s) => s.order_id === order.id) ?? null,
      }));

      previewDeliveryNote(notes, {
        storeName: branding?.store_name,
        tagline: branding?.tagline,
        supportPhone: branding?.support_phone,
        supportEmail: branding?.support_email,
        logoUrl: branding?.logo_url,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the delivery note");
    } finally {
      setPrinting(false);
    }
  }




  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Orders</h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input placeholder="Search order # or customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="sm:ml-auto"
          disabled={!checkedIds.length || printing}
          onClick={() => printDeliveryNotes(filtered.filter((o) => checked[o.id]))}
        >
          {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
          Print delivery notes{checkedIds.length ? ` (${checkedIds.length})` : ""}
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all orders"
                      checked={!!filtered.length && filtered.every((o) => checked[o.id])}
                      onCheckedChange={(v) =>
                        setChecked(v ? Object.fromEntries(filtered.map((o) => [o.id, true])) : {})
                      }
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Select order ${o.order_number}`}
                        checked={!!checked[o.id]}
                        onCheckedChange={(v) => setChecked((c) => ({ ...c, [o.id]: !!v }))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{o.order_number}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>{formatKES(o.total)}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={(v) => updateMutation.mutate({ id: o.id, patch: { status: v } })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={o.payment_status} onValueChange={(v) => setPayChange({ order: o, next: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(o.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" title="Print delivery note" onClick={() => printDeliveryNotes([o])}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setSelected(o)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selected?.order_number}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-1 rounded-md border border-border p-3">
                <p className="font-medium text-foreground">{selected.customer_name}</p>
                <p className="text-muted-foreground">{selected.customer_phone}{selected.customer_email ? ` · ${selected.customer_email}` : ""}</p>
                <p className="text-muted-foreground">
                  {[selected.street, selected.sub_county, selected.town, selected.county].filter(Boolean).join(", ") || "No address on file"}
                </p>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-foreground">Items</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items?.map((it) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.product_name}</TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>{formatKES(it.unit_price)}</TableCell>
                        </TableRow>
                      ))}
                      {!items?.length && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No items</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-medium text-foreground">
                <span>Total</span>
                <span>{formatKES(selected.total)}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{selected.status}</Badge>
                <Badge variant="outline">{selected.payment_status}</Badge>
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <h4 className="font-medium text-foreground">Fulfilment courier</h4>
                <p className="text-xs text-muted-foreground">
                  Pair this order with the courier who will deliver it — customers see this on the tracking page.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    value={shipment?.courier_id ?? ""}
                    onValueChange={(courierId) => pairCourier.mutate({ order: selected, courierId })}
                    disabled={pairCourier.isPending}
                  >
                    <SelectTrigger className="sm:w-64"><SelectValue placeholder="Select a courier" /></SelectTrigger>
                    <SelectContent>
                      {(couriers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {pairCourier.isPending && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                </div>
                {shipment?.tracking_number && (
                  <p className="text-xs text-muted-foreground">Tracking number: <span className="font-medium text-foreground">{shipment.tracking_number}</span></p>
                )}
              </div>

              <Button variant="outline" className="w-full" disabled={printing} onClick={() => printDeliveryNotes([selected])}>
                {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Print A4 delivery note
              </Button>
            </div>
          )}

        </DialogContent>
      </Dialog>

      <PaymentChangeDialog
        change={payChange}
        onClose={() => setPayChange(null)}
        onDone={() => {
          setPayChange(null);
          queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "payments"] });
        }}
      />
    </div>
  );
}

/** Guarded payment-status change: paid is blocked here, reversals need a reason (and admin email for auto M-Pesa). */
function PaymentChangeDialog({
  change,
  onClose,
  onDone,
}: {
  change: { order: Order; next: string } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const setStatus = useServerFn(setOrderPaymentStatus);
  const [reason, setReason] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const wasPaid = change?.order.payment_status === "paid";
  const blocked = change?.next === "paid";

  async function submit() {
    if (!change) return;
    setBusy(true);
    try {
      const res = (await setStatus({
        data: { orderId: change.order.id, paymentStatus: change.next, reason, adminEmail },
      })) as { message: string };
      toast.success(res.message);
      setReason("");
      setAdminEmail("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change the payment status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!change} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Change payment status
          </DialogTitle>
          <DialogDescription>
            {blocked
              ? "Orders cannot be marked paid here. Use Payments → “Mark paid manually” so the M-Pesa payment is verified first."
              : `Set ${change?.order.order_number} from ${change?.order.payment_status} to ${change?.next}.`}
          </DialogDescription>
        </DialogHeader>

        {!blocked && (
          <div className="space-y-3">
            {wasPaid && (
              <>
                <div>
                  <Label htmlFor="pc-reason">Reason</Label>
                  <Input
                    id="pc-reason"
                    value={reason}
                    maxLength={500}
                    placeholder="Why is this payment being reversed?"
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pc-email">Your admin email (only for automatic M-Pesa payments)</Label>
                  <Input
                    id="pc-email"
                    type="email"
                    value={adminEmail}
                    maxLength={200}
                    placeholder="admin@example.com"
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
              </>
            )}
            <Button className="w-full" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm change"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
