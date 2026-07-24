import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from "lucide-react";

const COLS = [
  { title: "Shop", links: ["Office Chairs", "Standing Desks", "Business Laptops", "Monitors", "Accessories"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Press", "Contact"] },
  { title: "Support", links: ["Track Order", "Returns", "Warranty", "FAQ", "Help Center"] },
  { title: "Policies", links: ["Privacy", "Terms", "Shipping", "Refunds", "Cookies"] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">J</div>
              <span className="text-lg font-semibold">JoyDesk</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Comfort meets productivity. Premium office furniture and tech for teams that build the future.
            </p>
            <div className="mt-6 flex gap-2">
              {[Facebook, Instagram, Twitter, Linkedin, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} JoyDesk. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Made with care for productive workspaces.</p>
        </div>
      </div>
    </footer>
  );
}
