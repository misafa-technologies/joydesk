import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop by category — JoyDesk" },
      { name: "description", content: "Browse JoyDesk's office chairs, standing desks, laptops, monitors and accessories by category." },
      { property: "og:title", content: "Shop by category — JoyDesk" },
      { property: "og:description", content: "Browse all JoyDesk product categories." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug, description, image_url").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("category_id").eq("is_active", true);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const p of data) {
        if (!p.category_id) continue;
        map[p.category_id] = (map[p.category_id] ?? 0) + 1;
      }
      return map;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Shop by category</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Find exactly what your workspace needs, organised by category.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.id }}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-5">
                  <h2 className="text-lg font-semibold group-hover:text-primary">{c.name}</h2>
                  {c.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <span className="mt-auto pt-3 text-xs font-medium text-muted-foreground">
                    {counts?.[c.id] ?? 0} product{(counts?.[c.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center text-sm text-muted-foreground">No categories yet.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
