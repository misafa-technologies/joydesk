import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, ShoppingBag } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/hooks/use-cart";
import { formatKES } from "@/lib/format";
import { imageSrc } from "@/lib/media";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — JoyDesk" },
      { name: "description", content: "Review the workspace items in your JoyDesk cart before checkout." },
      { property: "og:title", content: "Your cart — JoyDesk" },
      { property: "og:description", content: "Review your JoyDesk cart before checkout." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Your cart</h1>

        {cart.items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/shop" className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="divide-y divide-border rounded-xl border border-border">
              {cart.items.map((i) => (
                <div key={i.id} className="flex gap-4 p-4">
                  <Link to="/product/$slug" params={{ slug: i.slug }} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                    {i.image && <img src={imageSrc(i.image)!} alt={i.name} className="h-full w-full object-cover" />}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link to="/product/$slug" params={{ slug: i.slug }} className="text-sm font-semibold hover:text-primary">
                      {i.name}
                    </Link>
                    <div className="mt-1 text-sm text-muted-foreground">{formatKES(i.price)}</div>
                    <div className="mt-auto flex items-center gap-3">
                      <div className="flex items-center rounded-md border border-input">
                        <button className="px-2.5 py-1 text-sm" onClick={() => cart.setQty(i.id, i.quantity - 1)}>−</button>
                        <span className="w-8 text-center text-sm">{i.quantity}</span>
                        <button className="px-2.5 py-1 text-sm" onClick={() => cart.setQty(i.id, i.quantity + 1)}>+</button>
                      </div>
                      <button onClick={() => cart.remove(i.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{formatKES(i.price * i.quantity)}</div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Order summary</h2>
              <div className="mt-4 flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">{formatKES(cart.subtotal)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Delivery and discounts are calculated at checkout.</p>
              <Link
                to="/checkout"
                className="mt-5 block rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Proceed to checkout
              </Link>
              <button onClick={cart.clear} className="mt-3 w-full text-xs text-muted-foreground hover:text-destructive">
                Clear cart
              </button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
