import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Workspace tips — JoyDesk Blog" },
      { name: "description", content: "Practical advice on ergonomics, productivity and setting up a home or office workspace, from the JoyDesk team." },
      { property: "og:title", content: "Workspace tips — JoyDesk Blog" },
      { property: "og:description", content: "Practical advice on ergonomics and productivity." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: BlogPage,
});

const POSTS = [
  {
    title: "5 signs your office chair is hurting your back",
    excerpt: "Lower back pain by 3pm? Your chair might be the culprit. Here's how to spot the warning signs and what ergonomic features actually matter.",
    date: "2024-05-02",
    read: "5 min read",
  },
  {
    title: "Standing desk 101: how to transition without wrecking your day",
    excerpt: "Jumping straight into 8 hours of standing is a mistake. A simple interval routine to build up stamina and get the productivity benefits.",
    date: "2024-04-18",
    read: "6 min read",
  },
  {
    title: "The ideal monitor height, distance and angle — explained",
    excerpt: "Neck strain is almost always a setup problem. Use this quick checklist to get your screen positioned correctly in under 5 minutes.",
    date: "2024-04-02",
    read: "4 min read",
  },
  {
    title: "Setting up a productive home office on a budget in Kenya",
    excerpt: "You don't need a KSh 200,000 budget to build a home office that works. Here's what to prioritise first — and what can wait.",
    date: "2024-03-20",
    read: "7 min read",
  },
  {
    title: "Laptop vs desktop for small business owners: what we recommend",
    excerpt: "We help hundreds of Kenyan SMEs choose business tech every month. Here's our honest take on when a laptop wins and when it doesn't.",
    date: "2024-03-05",
    read: "5 min read",
  },
  {
    title: "How to organise your desk for fewer distractions",
    excerpt: "A cluttered desk is a cluttered mind. Simple, low-cost organisation habits that keep your workspace calm and focused.",
    date: "2024-02-14",
    read: "3 min read",
  },
];

function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" });
}

function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Workspace tips</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Practical, no-nonsense advice on ergonomics, productivity and building a
          workspace that works for you — from the JoyDesk team.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((post) => (
            <article
              key={post.title}
              className="flex flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <h2 className="text-base font-semibold leading-snug">{post.title}</h2>
              <p className="mt-3 line-clamp-4 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
              <div className="mt-5 flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatPostDate(post.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {post.read}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
