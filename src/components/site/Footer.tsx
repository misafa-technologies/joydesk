import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram, Twitter, Linkedin, Youtube, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COLS = [
  { title: "Shop", links: ["Office Chairs", "Standing Desks", "Business Laptops", "Monitors", "Accessories"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Press", "Contact"] },
  { title: "Support", links: ["Track Order", "Returns", "Warranty", "FAQ", "Help Center"] },
  { title: "Policies", links: ["Privacy", "Terms", "Shipping", "Refunds", "Cookies"] },
];

export function Footer() {
  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const socialLinks = [
    { url: storeSettings?.facebook_url, label: "Facebook", Icon: Facebook },
    { url: storeSettings?.instagram_url, label: "Instagram", Icon: Instagram },
    { url: storeSettings?.twitter_url, label: "Twitter / X", Icon: Twitter },
    { url: storeSettings?.linkedin_url, label: "LinkedIn", Icon: Linkedin },
    { url: storeSettings?.youtube_url, label: "YouTube", Icon: Youtube },
  ].filter((s): s is { url: string; label: string; Icon: typeof Facebook } => Boolean(s.url));

  const tiktokUrl = storeSettings?.tiktok_url;
  const storeName = storeSettings?.store_name ?? "JoyDesk";

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid gap-12 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              {storeSettings?.logo_url ? (
                <img src={storeSettings.logo_url} alt={storeName} className="h-8 w-auto max-w-[8rem] object-contain" />
              ) : (
                <>
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
                    {storeName.charAt(0)}
                  </div>
                  <span className="text-lg font-semibold">{storeName}</span>
                </>
              )}
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Comfort meets productivity. Premium office furniture and tech for teams that build the future.
            </p>
            {(socialLinks.length > 0 || tiktokUrl) && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {socialLinks.map(({ url, label, Icon }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  >
                    <Music2 className="h-4 w-4" /> TikTok
                  </a>
                )}
              </div>
            )}
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">Made with care for productive workspaces.</p>
        </div>
      </div>
    </footer>
  );
}
