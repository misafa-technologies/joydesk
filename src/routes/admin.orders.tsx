import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye } from "lucide-react";
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
                      <Select value={o.payment_status} onValueChange={(v) => updateMutation.mutate({ id: o.id, patch: { payment_status: v } })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(o.created_at)}</TableCell>
                    <TableCell className="text-right">
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
