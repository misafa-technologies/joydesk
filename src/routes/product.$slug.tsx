import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ShoppingCart, Heart, Truck, ShieldCheck, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { formatKES, discountPercent } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { ProductCard, type ProductLike } from "@/components/site/ProductCard";
import { MediaImage } from "@/components/site/MediaImage";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — JoyDesk` },
      { name: "description", content: "Product details, specifications and pricing at JoyDesk Kenya." },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} — JoyDesk` },
      { property: "og:description", content: "Product details, specifications and pricing at JoyDesk Kenya." },
      { property: "og:type", content: "product" },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const cart = useCart();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["related", product?.category_id, product?.id],
    enabled: !!product?.category_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, compare_price, images, rating, review_count, stock, tag")
        .eq("category_id", product!.category_id!)
        .eq("is_active", true)
        .neq("id", product!.id)
        .limit(4);
      if (error) throw error;
      return data as ProductLike[];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, title, body, author_name, created_at")
        .eq("product_id", product!.id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function addWishlist() {
    if (!user) return toast.error("Sign in to save items", { description: "Create a free JoyDesk account." });
    const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: product!.id });
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    toast.success("Saved to wishlist");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-xl bg-muted" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have been removed or renamed.</p>
          <Link to="/shop" className="mt-6 text-sm font-semibold text-primary hover:underline">
            Back to shop
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const images: string[] = product.images ?? [];
  const off = discountPercent(Number(product.price), product.compare_price);
  const specs = (product.specs ?? {}) as Record<string, string>;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link> / <Link to="/shop" className="hover:text-foreground">Shop</Link> /{" "}
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
              {images[active] ? (
                <MediaImage src={images[active]} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => setActive(i)}
                    className={`h-16 w-16 overflow-hidden rounded-md border ${i === active ? "border-primary" : "border-border"}`}
                  >
                    <MediaImage src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.tag && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase text-secondary-foreground">
                {product.tag}
              </span>
            )}
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(Number(product.rating)) ? "fill-secondary text-secondary" : "text-muted-foreground/40"}`}
                  />
                ))}
              </span>
              {Number(product.rating).toFixed(1)} · {product.review_count} reviews
            </div>

            <div className="mt-5 flex items-end gap-3">
              <div className="text-3xl font-bold">{formatKES(product.price)}</div>
              {product.compare_price && (
                <>
                  <div className="text-lg text-muted-foreground line-through">{formatKES(product.compare_price)}</div>
                  {off && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">-{off}%</span>}
                </>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.short_description || product.description}
            </p>

            {product.features?.length > 0 && (
              <ul className="mt-5 space-y-2">
                {product.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {f}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-md border border-input">
                <button className="px-3 py-2 text-sm" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <button className="px-3 py-2 text-sm" onClick={() => setQty(Math.min(product.stock || 99, qty + 1))}>+</button>
              </div>
              <button
                disabled={product.stock <= 0}
                onClick={() => {
                  cart.add(
                    {
                      id: product.id,
                      slug: product.slug,
                      name: product.name,
                      price: Number(product.price),
                      image: images[0] ?? null,
                      stock: product.stock,
                    },
                    qty,
                  );
                  toast.success("Added to cart", { description: `${qty} × ${product.name}` });
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" /> {product.stock > 0 ? "Add to cart" : "Out of stock"}
              </button>
              <button
                onClick={addWishlist}
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <Heart className="h-4 w-4" /> Save
              </button>
            </div>

            <div className="mt-6 grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Free delivery over KSh 15,000</span>
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> 2-year warranty</span>
            </div>

            {Object.keys(specs).length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Specifications</h2>
                <dl className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {Object.entries(specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        <section className="mt-16">
          <h2 className="text-xl font-bold tracking-tight">Customer reviews</h2>
          {reviews && reviews.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-secondary text-secondary" : "text-muted-foreground/40"}`} />
                    ))}
                  </div>
                  {r.title && <p className="mt-2 text-sm font-semibold">{r.title}</p>}
                  <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">— {r.author_name ?? "Verified buyer"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No reviews yet for this product.</p>
          )}
        </section>

        {related && related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-bold tracking-tight">You may also like</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
