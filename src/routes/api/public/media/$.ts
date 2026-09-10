import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "media";

/**
 * Same-origin image proxy for the private `media` bucket.
 *
 * Storing signed storage links in the database is fragile: the token can expire
 * and the URL is tied to one backend host. Instead we store bucket paths and
 * serve them from whatever domain the site is running on.
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(data.stream(), {
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
