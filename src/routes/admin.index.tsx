import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, ShoppingCart, Users, Package, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Overview — JoyDesk Admin" },
      { name: "description", content: "Key metrics, recent orders and low stock alerts for JoyDesk." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, total, status, payment_status, created_at").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock, low_stock_threshold"),
      ]);
      if (ordersRes.error) throw ordersRes.error;
      if (customersRes.error) throw customersRes.error;
      if (productsRes.error) throw productsRes.error;

      const orders = ordersRes.data ?? [];
      const products = productsRes.data ?? [];
      const revenue = orders.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + Number(o.total), 0);
      const lowStock = products.filter((p) => p.stock <= p.low_stock_threshold);

      return {
        revenue,
        orderCount: orders.length,
        customerCount: customersRes.count ?? 0,
        productCount: products.length,
        lowStock,
        recentOrders: orders.slice(0, 8),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { label: "Revenue (paid)", value: formatKES(data?.revenue), icon: TrendingUp },
    { label: "Orders", value: data?.orderCount ?? 0, icon: ShoppingCart },
    { label: "Customers", value: data?.customerCount ?? 0, icon: Users },
    { label: "Products", value: data?.productCount ?? 0, icon: Package },
    { label: "Low stock", value: data?.lowStock.length ?? 0, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Overview</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {!data?.recentOrders.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.order_number}</TableCell>
                      <TableCell>{o.customer_name}</TableCell>
                      <TableCell>{formatKES(o.total)}</TableCell>
                      <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(o.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4">
              <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">
                View all orders →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.lowStock.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All stock levels are healthy.</p>
            ) : (
              <ul className="space-y-2">
                {data.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground">{p.name}</span>
                    <Badge variant="destructive">{p.stock} left</Badge>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Link to="/admin/products" className="text-sm font-medium text-primary hover:underline">
                Manage products →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
