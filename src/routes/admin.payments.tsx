import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDateTime } from "@/lib/format";
import { verifyManualPayment } from "@/lib/manual-payment.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments — JoyDesk Admin" },
      { name: "description", content: "Review M-Pesa and other payment transactions." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPayments,
});

const STATUSES = ["pending", "success", "failed", "cancelled"];

function AdminPayments() {
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, orders(order_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Record<string, unknown> & {
        id: string; amount: number; phone: string | null; status: string; mpesa_receipt: string | null;
        result_desc: string | null; created_at: string; orders: { order_number: string } | null;
      })[];
    },
  });

  const filtered = useMemo(() => {
    if (status === "all") return data ?? [];
    return (data ?? []).filter((p) => p.status === status);
  }, [data, status]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Payments</h2>

      <ManualVerifyCard />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>


      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No payments found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.orders?.order_number ?? "—"}</TableCell>
                    <TableCell>{formatKES(p.amount)}</TableCell>
                    <TableCell>{p.phone ?? "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{p.status}</Badge></TableCell>
                    <TableCell>{p.mpesa_receipt ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setSelected(p)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payment detail</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Order:</span> {(selected.orders as { order_number?: string } | null)?.order_number ?? "—"}</p>
              <p><span className="text-muted-foreground">Amount:</span> {formatKES(selected.amount as number)}</p>
              <p><span className="text-muted-foreground">Phone:</span> {(selected.phone as string) ?? "—"}</p>
              <p><span className="text-muted-foreground">Status:</span> {selected.status as string}</p>
              <p><span className="text-muted-foreground">Receipt:</span> {(selected.mpesa_receipt as string) ?? "—"}</p>
              <p><span className="text-muted-foreground">Result:</span> {(selected.result_desc as string) ?? "—"}</p>
              <p><span className="text-muted-foreground">Date:</span> {formatDateTime(selected.created_at as string)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Validate a Paybill payment made outside STK push, by business + account number. */
function ManualVerifyCard() {
  const qc = useQueryClient();
  const verify = useServerFn(verifyManualPayment);
  const [form, setForm] = useState({ businessNumber: "", accountNumber: "", mpesaCode: "", amount: "" });
  const [busy, setBusy] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["admin", "mpesa-config-shortcode"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mpesa_config")
        .select("short_code, party_b")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const shortCode = config?.short_code ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = (await verify({
        data: {
          businessNumber: form.businessNumber || shortCode,
          accountNumber: form.accountNumber,
          mpesaCode: form.mpesaCode || undefined,
          amount: form.amount ? Number(form.amount) : undefined,
        },
      })) as { status: string; message: string };
      if (res.status === "unconfirmed") toast.warning(res.message);
      else toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      if (res.status !== "unconfirmed") setForm({ businessNumber: "", accountNumber: "", mpesaCode: "", amount: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Mark paid manually
        </CardTitle>
        <CardDescription>
          For customers who paid straight to the Paybill. We match the business number and account number, confirm with
          M-Pesa where possible, then mark the order paid and notify the customer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="mv-business">Business number</Label>
            <Input
              id="mv-business"
              value={form.businessNumber}
              placeholder={shortCode || "Paybill / Till"}
              maxLength={12}
              onChange={(e) => setForm((f) => ({ ...f, businessNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="mv-account">Account number (order no.)</Label>
            <Input
              id="mv-account"
              required
              value={form.accountNumber}
              placeholder="JD-XXXXXX"
              maxLength={40}
              onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="mv-code">M-Pesa code (optional)</Label>
            <Input
              id="mv-code"
              value={form.mpesaCode}
              placeholder="SLK4H2XYZ1"
              maxLength={20}
              onChange={(e) => setForm((f) => ({ ...f, mpesaCode: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="mv-amount">Amount paid (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="mv-amount"
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
