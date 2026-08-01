import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useRoles } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { BadgePercent, Boxes, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Home, Loader2, Menu, PackageCheck, Settings, ShieldAlert, SlidersHorizontal, Star, Users, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — JoyDesk" },
      { name: "description", content: "JoyDesk staff dashboard for managing products, orders, customers and store settings." },
      { property: "og:title", content: "Admin — JoyDesk" },
      { property: "og:description", content: "JoyDesk staff dashboard for store operations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", exact: true, icon: Home },
  { to: "/admin/products", label: "Products & stock", icon: Boxes },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: BadgePercent },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/payments", label: "Payments", icon: CircleDollarSign },
  { to: "/admin/shipping", label: "Shipping", icon: PackageCheck },
  { to: "/admin/settings", label: "Store settings", icon: SlidersHorizontal },
  { to: "/admin/integrations", label: "Integrations", icon: Settings },
] as const;

function AdminLayout() {
  const { isStaff, loading } = useRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-4 text-lg font-semibold text-foreground">Access denied — staff only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need staff or admin permissions to view the JoyDesk dashboard.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to store
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) => (exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

  return (
    <div className="flex min-h-screen bg-muted/20">
      {mobileOpen && <button className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" aria-label="Close admin menu" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all lg:sticky lg:top-0 lg:z-auto lg:h-screen", collapsed ? "w-16" : "w-64", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">J</div>
          {!collapsed && <div className="ml-3"><h1 className="font-bold">JoyDesk</h1><p className="text-xs text-muted-foreground">Store operations</p></div>}
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={`${item.to}-${item.label}`}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  isActive(item.to, "exact" in item ? item.exact : false)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
        </nav>
        <div className="border-t border-sidebar-border p-2"><Link to="/" className="flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-sidebar-accent"><ChevronLeft className="h-4 w-4" />{!collapsed && "Back to store"}</Link><button className="mt-1 hidden h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-sidebar-accent lg:flex" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{!collapsed && "Collapse sidebar"}</button></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6"><button className="mr-3 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open admin menu"><Menu className="h-5 w-5" /></button><div><p className="text-sm font-semibold">Admin dashboard</p><p className="text-xs text-muted-foreground">Manage catalogue, fulfilment and payments</p></div><Link to="/" className="ml-auto text-sm font-medium text-primary hover:underline">View store</Link></header>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
