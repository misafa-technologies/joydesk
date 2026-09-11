import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "media";

/**
 * Same-origin image proxy for the `media` bucket.
 *
 * Storing signed storage links in the database is fragile: the token can expire
 * and the URL is tied to one backend host. Instead we store bucket paths and
 * serve them from whatever domain the site is running on.
 *
 * Reads go through the publishable key (a public SELECT policy covers the
 * bucket), so the route works on hosts where the service-role key is not
 * configured (e.g. Vercel). The service-role client is only a fallback.
 */
export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = (params as { _splat?: string })._splat ?? "";
        const path = decodeURIComponent(raw).replace(/^\/+/, "").split("?")[0]!;

        // Only allow simple bucket paths — no traversal, no absolute URLs.
        if (!path || path.includes("..") || path.startsWith("/")) {
          return new Response("Not found", { status: 404 });
        }

        const url =
          process.env["SUPABASE_URL"] ||
          process.env["VITE_SUPABASE_URL"] ||
          import.meta.env.VITE_SUPABASE_URL;
        const key =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ||
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const encoded = path.split("/").map(encodeURIComponent).join("/");

        if (url && key) {
          for (const kind of ["public", "authenticated"] as const) {
            try {
              const res = await fetch(`${url}/storage/v1/object/${kind}/${BUCKET}/${encoded}`, {
                headers: { apikey: key, Authorization: `Bearer ${key}` },
              });
              if (res.ok && res.body) {
                return new Response(res.body, {
                  headers: {
                    "content-type": res.headers.get("content-type") || "application/octet-stream",
                    "cache-control": "public, max-age=31536000, immutable",
                  },
                });
              }
            } catch {
              // try the next strategy
            }
          }
        }

        // Fallback: service-role download (available on Lovable Cloud hosting).
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
          if (!error && data) {
            return new Response(data.stream(), {
              headers: {
                "content-type": data.type || "application/octet-stream",
                "cache-control": "public, max-age=31536000, immutable",
              },
            });
          }
        } catch {
          // fall through to 404
        }

        return new Response("Not found", { status: 404 });
      },
    },
  },
});
