import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Eye, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/admin/quotes")({
  head: () => ({
    meta: [
      { title: "Bulk quotations — JoyDesk Admin" },
      { name: "description", content: "Review and respond to corporate bulk quotation requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminQuotes,
});

type SelectedProduct = { id?: string; name: string; quantity: number; unit_price?: number };

type QuoteRow = {
  id: string;
  company: string;
  contact_person: string;
  email: string;
  phone: string;
  selected_products: unknown;
  other_items: string | null;
  quantity: string | null;
  budget: string | null;
  notes: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const STATUSES = ["new", "in_review", "quoted", "won", "lost"];

function itemsOf(row: QuoteRow): SelectedProduct[] {
  return Array.isArray(row.selected_products) ? (row.selected_products as SelectedProduct[]) : [];
}

function AdminQuotes() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QuoteRow | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quote_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as QuoteRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!q || r.company.toLowerCase().includes(q) || r.contact_person.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)),
    );
  }, [data, status, search]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("quote_requests").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Quotation updated");
      qc.invalidateQueries({ queryKey: ["admin", "quotes"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Corporate bulk quotations</h2>
        <p className="text-sm text-muted-foreground">Requests submitted from the quotation page, with the products customers picked.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search company, person or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No quotation requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.company}</TableCell>
                    <TableCell>
                      <div>{r.contact_person}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    </TableCell>
                    <TableCell>{itemsOf(r).length || (r.other_items ? "Custom" : "—")}</TableCell>
                    <TableCell>{r.budget ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => update.mutate({ id: r.id, patch: { status: v } })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => { setSelected(r); setNote(r.admin_note ?? ""); }}>
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
          <DialogHeader><DialogTitle>{selected?.company}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border border-border p-3">
                <p className="font-medium text-foreground">{selected.contact_person}</p>
                <p className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground">
                  <a href={`tel:${selected.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" />{selected.phone}</a>
                  <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" />{selected.email}</a>
                </p>
              </div>

              {!!itemsOf(selected).length && (
                <div>
                  <h4 className="mb-2 font-medium text-foreground">Selected products</h4>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Indicative unit</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsOf(selected).map((i, n) => (
                        <TableRow key={`${i.id ?? i.name}-${n}`}>
                          <TableCell>{i.name}</TableCell>
                          <TableCell>{i.quantity}</TableCell>
                          <TableCell>{i.unit_price ? formatKES(i.unit_price) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selected.other_items && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Items not in the catalogue</p>
                  <p className="mt-1 whitespace-pre-wrap">{selected.other_items}</p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">Overall quantity</p><p>{selected.quantity ?? "—"}</p></div>
                <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">Budget</p><p>{selected.budget ?? "—"}</p></div>
                <div className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">Status</p><Badge variant="secondary">{selected.status}</Badge></div>
              </div>

              {selected.notes && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}

              <div>
                <Label htmlFor="quote-note">Internal note</Label>
                <Textarea id="quote-note" value={note} maxLength={1000} rows={3} onChange={(e) => setNote(e.target.value)} className="mt-1.5" />
                <Button className="mt-2" size="sm" onClick={() => update.mutate({ id: selected.id, patch: { admin_note: note } })} disabled={update.isPending}>
                  Save note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
