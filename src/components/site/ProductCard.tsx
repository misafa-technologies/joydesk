import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatKES, discountPercent } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { imageSrc } from "@/lib/media";

export interface ProductLike {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_price: number | null;
  images: string[];
  rating: number;
  review_count: number;
  stock: number;
  tag: string | null;
}

export function ProductCard({ product }: { product: ProductLike }) {
  const cart = useCart();
  const off = discountPercent(Number(product.price), product.compare_price);
  const image = imageSrc(product.images?.[0] ?? null);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-[4/3] overflow-hidden bg-muted"
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {product.tag && (
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
              {product.tag}
            </span>
          )}
          {off && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-accent-foreground">
              -{off}%
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-secondary text-secondary" />
          {Number(product.rating).toFixed(1)}
          <span>({product.review_count})</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <div className="text-base font-bold">{formatKES(product.price)}</div>
            {product.compare_price && (
              <div className="text-xs text-muted-foreground line-through">
                {formatKES(product.compare_price)}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (product.stock <= 0) return toast.error("Out of stock");
              cart.add({
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: Number(product.price),
                image,
                stock: product.stock,
              });
              toast.success("Added to cart", { description: product.name });
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            aria-label={`Add ${product.name} to cart`}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
