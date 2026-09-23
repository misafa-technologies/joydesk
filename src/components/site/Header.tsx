import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, Heart, User, Menu, X, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/use-cart";
import { useRoles } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { MediaImage } from "@/components/site/MediaImage";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/brands", label: "Brands" },
  { to: "/deals", label: "Deals" },
  { to: "/quote", label: "Corporate" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [term, setTerm] = useState("");
  const cart = useCart();
  const { user, isStaff } = useRoles();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setShowSearch(false);
    setOpen(false);
    navigate({ to: "/shop", search: (prev: Record<string, unknown>) => ({ ...prev, q: term.trim() || undefined }) });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          {storeSettings?.logo_url ? (
            <MediaImage
              src={storeSettings.logo_url}
              alt={storeSettings.store_name}
              className="h-9 w-auto max-w-[8.5rem] object-contain sm:h-10 sm:max-w-[11rem] lg:h-11 lg:max-w-[13rem]"
            />
          ) : (
            <>
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground font-bold text-sm sm:h-10 sm:w-10">
                {(storeSettings?.store_name ?? "JoyDesk").charAt(0)}
              </div>
              <span className="text-lg font-semibold tracking-tight sm:text-xl">{storeSettings?.store_name ?? "JoyDesk"}</span>
            </>
          )}
        </Link>


        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            to="/wishlist"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
          </Link>
          <Link
            to="/cart"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                {cart.count}
              </span>
            )}
          </Link>
          {isStaff && (
            <Link
              to="/admin"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
              aria-label="Admin dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>
          )}
          {user ? (
            <div className="ml-2 hidden items-center gap-1 md:flex">
              <Link
                to="/account"
                className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <User className="h-3.5 w-3.5" /> Account
              </Link>
              <button
                onClick={async () => {
                  await queryClient.cancelQueries();
                  queryClient.clear();
                  await supabase.auth.signOut();
                  navigate({ to: "/auth", replace: true });
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="ml-2 hidden items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted md:inline-flex"
            >
              <User className="h-3.5 w-3.5" /> Login
            </Link>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {showSearch && (
        <form onSubmit={submitSearch} className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search chairs, desks, monitors…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Search
            </button>
          </div>
        </form>
      )}

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                {n.label}
              </Link>
            ))}
            <Link to="/wishlist" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              Wishlist
            </Link>
            {isStaff && (
              <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Admin dashboard
              </Link>
            )}
            {user ? (
              <>
                <Link to="/account" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  My account
                </Link>
                <button
                  onClick={async () => {
                    await queryClient.cancelQueries();
                    queryClient.clear();
                    await supabase.auth.signOut();
                    setOpen(false);
                    navigate({ to: "/auth", replace: true });
                  }}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-muted"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                Login / Register
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
