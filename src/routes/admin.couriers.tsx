import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COUNTY_NAMES } from "@/data/kenya-locations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, Truck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/admin/couriers")({
  head: () => ({
    meta: [
      { title: "Couriers — JoyDesk Admin" },
      { name: "description", content: "Manage delivery couriers, coverage counties and tracking links for JoyDesk shipments." },
      { property: "og:title", content: "Couriers — JoyDesk Admin" },
      { property: "og:description", content: "Manage JoyDesk courier partners and coverage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCouriers,
});

type Courier = Database["public"]["Tables"]["couriers"]["Row"];

const EMPTY = {
  id: "",
  name: "",
  phone: "",
  website: "",
  tracking_url_template: "",
  counties: [] as string[],
  notes: "",
  is_active: true,
};

function AdminCouriers() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");

  const { data: couriers, isLoading } = useQuery({
    queryKey: ["admin", "couriers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("couriers").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data as Courier[];
    },
  });

  const filtered = useMemo(() => {
    return (couriers ?? []).filter((c) => {
      const matchesSearch = !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()) || (c.phone ?? "").includes(search.trim());
      const matchesCounty = countyFilter === "all" || (c.counties ?? []).includes(countyFilter);
      return matchesSearch && matchesCounty;
    });
  }, [couriers, search, countyFilter]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        tracking_url_template: form.tracking_url_template.trim() || null,
        counties: form.counties,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };
      if (form.id) {
        const { error } = await supabase.from("couriers").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("couriers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Courier updated" : "Courier added");
      queryClient.invalidateQueries({ queryKey: ["admin", "couriers"] });
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("couriers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Courier deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "couriers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => { setForm(EMPTY); setOpen(true); };
  const openEdit = (c: Courier) => {
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      website: c.website ?? "",
      tracking_url_template: c.tracking_url_template ?? "",
      counties: c.counties ?? [],
      notes: c.notes ?? "",
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const toggleCounty = (county: string) => {
    setForm((f) => ({
      ...f,
      counties: f.counties.includes(county) ? f.counties.filter((c) => c !== county) : [...f.counties, county],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Couriers</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" /> New courier</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader><DialogTitle>{form.id ? "Edit courier" : "New courier"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="07XX XXX XXX" />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://…" />
                </div>
              </div>
              <div>
                <Label>Tracking URL template</Label>
                <Input
                  value={form.tracking_url_template}
                  onChange={(e) => setForm((f) => ({ ...f, tracking_url_template: e.target.value }))}
                  placeholder="https://courier.co.ke/track?ref={tracking}"
                />
                <p className="mt-1 text-xs text-muted-foreground">Use <code>{"{tracking}"}</code> as a placeholder for the tracking number.</p>
              </div>
              <div>
                <Label>Coverage counties</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-1 w-full justify-between font-normal">
                      {form.counties.length ? `${form.counties.length} selected` : "Select counties"}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-h-72 w-72 overflow-y-auto p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {COUNTY_NAMES.map((county) => (
                        <label key={county} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                          <Checkbox checked={form.counties.includes(county)} onCheckedChange={() => toggleCounty(county)} />
                          {county}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {form.counties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {form.counties.map((c) => (
                      <Badge key={c} variant="secondary" className="cursor-pointer" onClick={() => toggleCounty(c)}>{c} ×</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
                {saveMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="max-w-xs"
        />
        <Select value={countyFilter} onValueChange={setCountyFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filter by county" /></SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All counties</SelectItem>
            {COUNTY_NAMES.map((county) => <SelectItem key={county} value={county}>{county}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {couriers?.length ? "No couriers match your filters." : "No couriers yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Tracking URL</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-muted-foreground" />{c.name}</span>
                    </TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-[10rem] truncate">
                      {c.website ? <a href={c.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{c.website}</a> : "—"}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">{c.tracking_url_template ?? "—"}</TableCell>
                    <TableCell className="max-w-[14rem]">
                      {c.counties?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {c.counties.slice(0, 3).map((county) => <Badge key={county} variant="outline">{county}</Badge>)}
                          {c.counties.length > 3 && <Badge variant="outline">+{c.counties.length - 3}</Badge>}
                        </div>
                      ) : <span className="text-muted-foreground">All counties</span>}
                    </TableCell>
                    <TableCell><Badge variant={c.is_active ? "secondary" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete courier?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove "{c.name}". Shipments referencing it will keep their history but lose the courier link.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
