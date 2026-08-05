import { createFileRoute, Link } from "@tanstack/react-router";
import { Wrench, Truck, Ruler, Users, ShieldCheck, Headphones, ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Workspace services — JoyDesk" },
      { name: "description", content: "Office space planning, delivery and installation, ergonomic assessments, corporate fit-outs, maintenance and IT setup services from JoyDesk in Kenya." },
      { property: "og:title", content: "Workspace services — JoyDesk" },
      { property: "og:description", content: "Space planning, installation, ergonomic assessments and corporate fit-out services from JoyDesk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicesPage,
});

const SERVICES = [
  { icon: Ruler, title: "Space planning & layout", desc: "Floor plans, desk density and traffic-flow design tailored to your team size and office footprint." },
  { icon: Truck, title: "Delivery & installation", desc: "Countrywide delivery with in-house fitters who assemble, level and test every workstation on site." },
  { icon: Users, title: "Ergonomic assessments", desc: "On-site posture and setup reviews so each employee gets the right chair height, monitor arm and desk depth." },
  { icon: Wrench, title: "Maintenance & repairs", desc: "Scheduled servicing for chairs, sit-stand mechanisms and desk electrics, with genuine spare parts." },
  { icon: ShieldCheck, title: "Corporate fit-outs", desc: "End-to-end fit-out of new offices, branch rollouts and hybrid hot-desk zones under one project manager." },
  { icon: Headphones, title: "IT & AV setup", desc: "Monitor mounting, cable management, docking stations and meeting-room AV configured and handed over ready to use." },
];

const STEPS = [
  { n: "01", title: "Consultation", desc: "Share your floor plan, headcount and budget. We visit or review remotely." },
  { n: "02", title: "Proposal", desc: "You get a layout, product list and costed quotation within one working day." },
  { n: "03", title: "Delivery & install", desc: "We schedule delivery windows, install on site and remove all packaging." },
  { n: "04", title: "Aftercare", desc: "Warranty support, servicing and parts for the life of the furniture." },
];

function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="border-b border-border bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              More than furniture — a workspace service partner
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              From the first floor plan to the last bolt tightened, JoyDesk handles the parts of an office
              rollout that usually eat your team's time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/quote" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Request a quotation <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted">
                Talk to our team
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">What we do</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">How a project runs</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                  <span className="text-xs font-bold tracking-widest text-secondary">{s.n}</span>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-primary p-10 text-primary-foreground lg:p-14">
            <h2 className="text-3xl font-semibold tracking-tight">Planning an office move or refresh?</h2>
            <p className="mt-3 max-w-2xl text-primary-foreground/80">
              Send us your requirements and we'll come back with a layout, product list and a costed quotation.
            </p>
            <Link to="/quote" className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90">
              Start a corporate quote <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
