import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard, type ProductLike } from "@/components/site/ProductCard";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Deals & discounts — JoyDesk" },
      { name: "description", content: "The biggest discounts on office chairs, standing desks, laptops and monitors at JoyDesk Kenya." },
      { property: "og:title", content: "Deals & discounts — JoyDesk" },
      { property: "og:description", content: "The biggest discounts on office furniture and tech at JoyDesk." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DealsPage,
});

function DealsPage() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, compare_price, images, rating, review_count, stock, tag")
        .eq("is_active", true)
        .not("compare_price", "is", null)
        .limit(200);
      if (error) throw error;
      const withDiscount = (data as ProductLike[])
        .filter((p) => p.compare_price && Number(p.compare_price) > Number(p.price))
        .map((p) => ({ p, pct: (Number(p.compare_price) - Number(p.price)) / Number(p.compare_price) }))
        .sort((a, b) => b.pct - a.pct)
        .map((x) => x.p);
      return withDiscount;
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-accent" />
          <h1 className="text-3xl font-bold tracking-tight">Deals & discounts</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Our biggest markdowns, sorted from the deepest discount.
        </p>

        {isLoading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center">
            <p className="text-sm text-muted-foreground">No active deals right now — check back soon!</p>
            <Link to="/shop" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Browse all products
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
