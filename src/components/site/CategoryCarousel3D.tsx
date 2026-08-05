import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

export type Carousel3DItem = { name: string; slug: string; img: string; count: string };

/**
 * A 3D circular carousel: cards are placed around a cylinder and the ring
 * rotates continuously. Radius and card size scale with the container width so
 * it stays readable from small phones up to wide desktops.
 */
export function CategoryCarousel3D({ items, loading }: { items: Carousel3DItem[]; loading?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { cardW, cardH, radius, stageH } = useMemo(() => {
    const w = width || 640;
    const cardW = Math.max(140, Math.min(240, Math.round(w * 0.42)));
    const cardH = Math.round(cardW * 1.25);
    const n = Math.max(items.length, 3);
    // radius that keeps neighbouring cards from overlapping
    const radius = Math.round((cardW * 0.62) / Math.tan(Math.PI / n) + cardW * 0.15);
    const stageH = cardH + 130;
    return { cardW, cardH, radius, stageH };
  }, [width, items.length]);

  if (loading) {
    return (
      <div ref={wrapRef} className="grid place-items-center" style={{ height: 380 }}>
        <div className="h-52 w-40 animate-pulse rounded-2xl bg-muted sm:h-64 sm:w-48" />
      </div>
    );
  }

  const step = 360 / Math.max(items.length, 1);

  return (
    <div ref={wrapRef} className="relative w-full select-none" aria-label="Shop by category">
      <div
        className="carousel3d-stage"
        style={{ height: stageH }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="carousel3d-ring" style={{ animationPlayState: paused ? "paused" : "running" }}>
          {items.map((item, i) => (
            <Link
              key={item.slug}
              to="/shop"
              search={{ category: item.slug }}
              className="carousel3d-card group"
              style={{
                width: cardW,
                height: cardH,
                marginLeft: -cardW / 2,
                marginTop: -cardH / 2,
                transform: `rotateY(${i * step}deg) translateZ(${radius}px)`,
              }}
            >
              <span className="absolute inset-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                <img
                  src={item.img}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-3 text-left">
                  <span className="block truncate text-sm font-semibold text-foreground">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">{item.count}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Hover to pause · tap a category to shop</p>
    </div>
  );
}
