import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Truck, ShieldCheck, Lock, Award, Building2, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CategoryCarousel3D } from "@/components/site/CategoryCarousel3D";

import catChairs from "@/assets/cat-chairs.jpg";
import catDesks from "@/assets/cat-desks.jpg";
import catLaptops from "@/assets/cat-laptops.jpg";
import catMonitors from "@/assets/cat-monitors.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JoyDesk — Comfort Meets Productivity" },
      { name: "description", content: "Premium office furniture, ergonomic chairs, standing desks, business laptops, monitors and accessories. Transform your workspace with JoyDesk." },
      { property: "og:title", content: "JoyDesk — Comfort Meets Productivity" },
      { property: "og:description", content: "Premium office furniture, ergonomic chairs, standing desks, business laptops, monitors and accessories. Transform your workspace with JoyDesk." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

const FALLBACK_IMAGES: Record<string, string> = {
  chairs: catChairs,
  desks: catDesks,
  laptops: catLaptops,
  monitors: catMonitors,
};

type HomeCategory = { name: string; slug: string; img: string; count: string };

/** Live categories, images and counts straight from the admin catalogue. */
function useHomeCategories(): { categories: HomeCategory[]; loading: boolean } {
  const { data, isPending } = useQuery({
    queryKey: ["home-categories"],
    staleTime: 60_000,
    queryFn: async () => {
      const [cats, products] = await Promise.all([
        supabase.from("categories").select("id, name, slug, image_url").order("name"),
        supabase.from("products").select("category_id").eq("is_active", true),
      ]);
      if (cats.error) throw cats.error;
      if (products.error) throw products.error;
      const counts = new Map<string, number>();
      for (const row of products.data ?? []) {
        if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
      }
      return (cats.data ?? []).map((c) => ({
        name: c.name,
        slug: c.slug,
        img: c.image_url || FALLBACK_IMAGES[c.slug] || catDesks,
        count: `${counts.get(c.id) ?? 0} product${(counts.get(c.id) ?? 0) === 1 ? "" : "s"}`,
      }));
    },
  });
  return { categories: data ?? [], loading: isPending };
}



const FEATURES = [
  { icon: Truck, title: "Free Delivery", desc: "Nationwide on orders over KSh 15,000" },
  { icon: ShieldCheck, title: "2-Year Warranty", desc: "On all furniture and electronics" },
  { icon: Lock, title: "Secure Payments", desc: "M-Pesa, cards, and bank transfer" },
  { icon: Award, title: "Quality Assured", desc: "Handpicked premium brands only" },
  { icon: Building2, title: "Corporate Orders", desc: "Custom quotes for bulk buyers" },
  { icon: MapPin, title: "Nationwide", desc: "Delivered to your doorstep" },
];

/** Brands come from the admin catalogue — nothing hard-coded. */
function useBrands() {
  const { data } = useQuery({
    queryKey: ["home-brands"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name, slug, logo_url").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  return data ?? [];
}

const TESTIMONIALS = [
  { name: "Amina W.", role: "Ops Lead, Nairobi", text: "The ergonomic chairs transformed our team's comfort. Delivery was flawless." },
  { name: "David K.", role: "Founder, Mombasa", text: "Kitted out the whole office in one week. Quality feels premium and prices are fair." },
  { name: "Priya S.", role: "IT Manager", text: "Best B2B experience in Kenya. The corporate quote team is responsive and sharp." },
];

function Home() {
  const { categories: CATEGORIES, loading: categoriesLoading } = useHomeCategories();
  const brands = useBrands();

  return (

    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 py-16 lg:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> New arrivals every week
            </span>
            <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground leading-[1.05]">
              Transform<br />Your Workspace
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground leading-relaxed">
              Premium office furniture, ergonomic chairs, standing desks, business laptops, gaming rigs and accessories — engineered for teams that care about how they work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/quote" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Request Quotation
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div><span className="text-xl font-semibold text-foreground">10k+</span><br />Happy customers</div>
              <div className="h-8 w-px bg-border" />
              <div><span className="text-xl font-semibold text-foreground">500+</span><br />Products</div>
              <div className="h-8 w-px bg-border" />
              <div><span className="text-xl font-semibold text-foreground">4.9★</span><br />Avg. rating</div>
            </div>
          </div>
          <div className="lg:pl-6">
            <CategoryCarousel3D items={CATEGORIES} loading={categoriesLoading} />
          </div>

        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Shop by category</h2>
            <p className="mt-2 text-muted-foreground">Everything your workspace needs, curated.</p>
          </div>
          <Link to="/categories" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((c) => (
            <Link key={c.name} to="/shop" search={{ category: c.slug }} className="group rounded-md border border-border bg-card p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted/40">
                <img src={c.img} alt={c.name} loading="lazy" width={800} height={800} className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{c.name}</h3>
              <p className="text-xs text-muted-foreground">{c.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl bg-card border border-border p-6">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORPORATE BULK QUOTATION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid gap-8 rounded-3xl border border-border bg-card p-8 lg:grid-cols-2 lg:items-center lg:p-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Building2 className="h-3.5 w-3.5" /> For businesses
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Corporate bulk quotation</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Kitting out a team, a floor or a whole office? Pick the products you need straight from our catalogue — or
              describe anything that isn't listed — and we'll send a tailored quote within one business day.
            </p>
            <Link to="/quote" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Request a quotation <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {["Select products or describe your own", "Volume pricing on 10+ units", "Dedicated account manager", "Delivery and installation included"].map((point) => (
              <li key={point} className="rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">{point}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* BRANDS — managed in admin */}
      {brands.length > 0 && (
        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trusted brands we carry</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {brands.map((b) => (
                <Link key={b.id} to="/shop" search={{ brand: b.slug }} className="group inline-flex items-center gap-2">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} loading="lazy" className="h-8 w-auto max-w-[120px] object-contain opacity-70 transition-opacity group-hover:opacity-100" />
                  ) : (
                    <span className="text-xl font-bold tracking-tight text-muted-foreground/70 transition-colors group-hover:text-foreground">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-center">Loved by modern teams</h2>
        <p className="mt-2 text-center text-muted-foreground">From startups to enterprises across the region.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-8">
              <div className="flex gap-0.5 text-secondary">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-4 text-foreground leading-relaxed">"{t.text}"</p>
              <div className="mt-6">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 lg:p-16 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Get 10% off your first order</h2>
              <p className="mt-3 text-primary-foreground/80">Join the newsletter for early access to deals, new arrivals, and workspace tips.</p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => e.preventDefault()}>
              <input type="email" required placeholder="Enter your email" className="flex-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 px-5 py-3 text-sm placeholder:text-primary-foreground/50 focus:outline-none focus:ring-2 focus:ring-secondary" />
              <button className="rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors">Subscribe</button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
