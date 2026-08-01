import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard, type ProductLike } from "@/components/site/ProductCard";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop office furniture & tech — JoyDesk" },
      { name: "description", content: "Browse ergonomic chairs, standing desks, business laptops, monitors and workspace accessories delivered across Kenya." },
      { property: "og:title", content: "Shop office furniture & tech — JoyDesk" },
      { property: "og:description", content: "Ergonomic chairs, standing desks, laptops and monitors delivered across Kenya." },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    category: typeof s.category === "string" ? s.category : undefined,
    brand: typeof s.brand === "string" ? s.brand : undefined,
    q: typeof s.q === "string" ? s.q.slice(0, 100) : undefined,
  }),
  component: Shop,
});

type SortKey = "newest" | "price-asc" | "price-desc" | "rating";

function Shop() {
  const search = Route.useSearch();
  const [category, setCategory] = useState<string>(search.category ?? "all");
  const [brand, setBrand] = useState<string>(search.brand ?? "all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [q, setQ] = useState(search.q ?? "");

  useEffect(() => {
    if (search.category) setCategory(search.category);
    if (search.brand) setBrand(search.brand);
    if (search.q !== undefined) setQ(search.q);
  }, [search.category, search.brand, search.q]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category, brand, sort, q, categories],
    enabled: category === "all" || !!categories,
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, slug, name, price, compare_price, images, rating, review_count, stock, tag, category_id, brand_id")
        .eq("is_active", true);
      if (category !== "all") {
        const categoryId = categories?.find((item) => item.id === category || item.slug === category)?.id;
        if (categoryId) query = query.eq("category_id", categoryId);
      }
      if (brand !== "all") query = query.eq("brand_id", brand);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      if (sort === "price-asc") query = query.order("price", { ascending: true });
      else if (sort === "price-desc") query = query.order("price", { ascending: false });
      else if (sort === "rating") query = query.order("rating", { ascending: false });
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query.limit(60);
      if (error) throw error;
      return data as ProductLike[];
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Premium workspace furniture and technology, delivered nationwide.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            maxLength={100}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2 sm:max-w-xs"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All brands</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rating">Top rated</option>
          </select>
          <span className="ml-auto hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <SlidersHorizontal className="h-4 w-4" />
            {products?.length ?? 0} products
          </span>
        </div>

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
          <p className="mt-16 text-center text-sm text-muted-foreground">No products match your filters.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}
