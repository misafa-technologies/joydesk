import { createFileRoute, Link } from "@tanstack/react-router";
import { Armchair, Heart, Leaf, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About JoyDesk — Comfort Meets Productivity" },
      { name: "description", content: "JoyDesk designs and delivers ergonomic office furniture and technology across Kenya, on a mission to make every workspace comfortable and productive." },
      { property: "og:title", content: "About JoyDesk — Comfort Meets Productivity" },
      { property: "og:description", content: "Our story, mission and values." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

const STATS = [
  { label: "Happy customers", value: "12,000+" },
  { label: "Counties delivered to", value: "47" },
  { label: "Products in catalogue", value: "500+" },
  { label: "Average rating", value: "4.8/5" },
];

const VALUES = [
  { icon: Heart, title: "Comfort first", desc: "Every chair and desk we sell is chosen for the human body, not just the eye." },
  { icon: ShieldCheck, title: "Genuine quality", desc: "We only stock furniture and tech we'd use ourselves, backed by real warranties." },
  { icon: Truck, title: "Reliable delivery", desc: "From Nairobi to Turkana, we get your order to your door — tracked and on time." },
  { icon: Leaf, title: "Built to last", desc: "Durable materials mean fewer replacements and less waste over time." },
];

function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Our story
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
              Comfort Meets Productivity
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              JoyDesk was founded in Nairobi with one simple belief: a comfortable workspace
              is a productive workspace. We curate ergonomic chairs, standing desks and
              business technology, then deliver them anywhere in Kenya — so every team,
              from a two-person startup to an established enterprise, can build their best
              work in a space that supports them.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/shop" className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Shop the collection
              </Link>
              <Link to="/contact" className="rounded-md border border-border px-6 py-3 text-sm font-medium hover:bg-muted">
                Talk to us
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-6 text-center">
                <div className="text-3xl font-bold text-primary">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <Armchair className="h-8 w-8 text-primary" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Our mission</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                To make ergonomic, high-quality workspaces accessible to every Kenyan
                professional and business — because how you work shouldn't compromise
                how you feel. We remove the guesswork from buying office furniture and
                tech online, with honest pricing, fast delivery and support that
                actually answers the phone.
              </p>
            </div>
            <div>
              <Sparkles className="h-8 w-8 text-primary" />
              <h2 className="mt-4 text-2xl font-bold tracking-tight">Our vision</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                To become East Africa's most trusted destination for workspace furniture
                and technology — the first name that comes to mind when a team is
                setting up an office, a home desk, or a boardroom.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight">What we stand for</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-xl border border-border bg-card p-6">
                <v.icon className="h-7 w-7 text-primary" />
                <h3 className="mt-4 text-sm font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-primary">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center text-primary-foreground sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready to upgrade your workspace?</h2>
            <p className="mt-3 text-sm text-primary-foreground/80 sm:text-base">
              Browse chairs, desks, laptops and monitors — delivered anywhere in Kenya.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-block rounded-md bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary hover:opacity-90"
            >
              Start shopping
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
