import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — JoyDesk Admin" },
      { name: "description", content: "Manage customer accounts and staff/admin roles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCustomers,
});

function AdminCustomers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const [profilesRes, rolesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase.from("orders").select("user_id, total"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (ordersRes.error) throw ordersRes.error;

      return (profilesRes.data ?? []).map((p) => {
        const roles = (rolesRes.data ?? []).filter((r) => r.user_id === p.user_id).map((r) => r.role);
        const orders = (ordersRes.data ?? []).filter((o) => o.user_id === p.user_id);
        return {
          ...p,
          roles,
          orderCount: orders.length,
          totalSpend: orders.reduce((s, o) => s + Number(o.total), 0),
        };
      });
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data ?? [];
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c) => (c.full_name ?? "").toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q));
  }, [data, search]);

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role, grant }: { userId: string; role: "staff" | "admin"; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Customers</h2>
      <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !filtered.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No customers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total spend</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                    <TableCell>{c.orderCount}</TableCell>
                    <TableCell>{formatKES(c.totalSpend)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={c.roles.includes("staff")}
                        onCheckedChange={(v) => roleMutation.mutate({ userId: c.user_id, role: "staff", grant: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.roles.includes("admin")}
                        onCheckedChange={(v) => roleMutation.mutate({ userId: c.user_id, role: "admin", grant: v })}
                      />
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
