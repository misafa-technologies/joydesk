import { Link } from "@tanstack/react-router";
import { Search, ShoppingCart, Heart, User, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/categories", label: "Categories" },
  { to: "/brands", label: "Brands" },
  { to: "/deals", label: "Deals" },
  { to: "/about", label: "About" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold text-sm">J</div>
          <span className="text-lg font-semibold tracking-tight">JoyDesk</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Wishlist">
            <Heart className="h-4 w-4" />
          </button>
          <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">0</span>
          </button>
          <Link to="/" className="hidden md:inline-flex ml-2 items-center gap-2 rounded-full border border-border px-3.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            <User className="h-3.5 w-3.5" /> Login
          </Link>
          <button onClick={() => setOpen(!open)} className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">{n.label}</Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
