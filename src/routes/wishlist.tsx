import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/format";
import { MediaImage } from "@/components/site/MediaImage";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Your wishlist — JoyDesk" },
      { name: "description", content: "Saved chairs, desks and tech you're planning to buy from JoyDesk." },
      { property: "og:title", content: "Your wishlist — JoyDesk" },
      { property: "og:description", content: "Saved items from JoyDesk." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const cart = useCart();
  const qc = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, product:products(id, slug, name, price, images, stock)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function removeItem(id: string) {
    await supabase.from("wishlists").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["wishlist"] });
    toast.success("Removed from wishlist");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Wishlist</h1>

        {!user ? (
          <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <Link to="/auth" search={{ redirect: "/wishlist" }} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>{" "}
            to view items you've saved.
          </p>
        ) : !items || items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Nothing saved yet.</p>
            <Link to="/shop" className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="mt-8 divide-y divide-border rounded-xl border border-border">
            {items.map((w) => {
              const p = w.product;
              if (!p) return null;
              return (
                <div key={w.id} className="flex items-center gap-4 p-4">
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="h-20 w-20 overflow-hidden rounded-md bg-muted">
                    {p.images?.[0] && <MediaImage src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />}
                  </Link>
                  <div className="flex-1">
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="text-sm font-semibold hover:text-primary">
                      {p.name}
                    </Link>
                    <div className="text-sm text-muted-foreground">{formatKES(p.price)}</div>
                  </div>
                  <button
                    onClick={() => {
                      cart.add({
                        id: p.id,
                        slug: p.slug,
                        name: p.name,
                        price: Number(p.price),
                        image: p.images?.[0] ?? null,
                        stock: p.stock,
                      });
                      toast.success("Added to cart");
                    }}
                    className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Add to cart
                  </button>
                  <button onClick={() => removeItem(w.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
