import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useRoles } from "@/hooks/use-role";
import { cn } from "@/lib/utils";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — JoyDesk" },
      { name: "description", content: "JoyDesk staff dashboard for managing products, orders, customers and store settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/coupons", label: "Coupons" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/shipping", label: "Shipping" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/integrations", label: "Integrations" },
] as const;

function AdminLayout() {
  const { isStaff, loading } = useRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold tracking-tight text-foreground">JoyDesk Admin</h1>
          <p className="text-xs text-muted-foreground">Manage your store</p>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:px-8">
        {/* Mobile: horizontal scroll nav */}
        <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 pb-2 lg:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.to, "exact" in item ? item.exact : false)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.to, "exact" in item ? item.exact : false)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
