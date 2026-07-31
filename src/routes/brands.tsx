import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/brands")({
  head: () => ({
    meta: [
      { title: "Shop by brand — JoyDesk" },
      { name: "description", content: "Explore trusted furniture and technology brands available at JoyDesk Kenya." },
      { property: "og:title", content: "Shop by brand — JoyDesk" },
      { property: "og:description", content: "Explore trusted brands available at JoyDesk." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: BrandsPage,
});

function BrandsPage() {
  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name, slug, logo_url").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["brand-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("brand_id").eq("is_active", true);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const p of data) {
        if (!p.brand_id) continue;
        map[p.brand_id] = (map[p.brand_id] ?? 0) + 1;
      }
      return map;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Shop by brand</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Trusted furniture and technology brands, all in one place.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : brands && brands.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {brands.map((b) => (
              <Link
                key={b.id}
                to="/shop"
                search={{ brand: b.id }}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-shadow hover:shadow-lg"
              >
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-muted">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain p-2" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{b.name[0]}</span>
                  )}
                </div>
                <h2 className="text-sm font-semibold group-hover:text-primary">{b.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {counts?.[b.id] ?? 0} product{(counts?.[b.id] ?? 0) === 1 ? "" : "s"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center text-sm text-muted-foreground">No brands yet.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
