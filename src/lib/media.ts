import { supabase } from "@/integrations/supabase/client";
import { siteOrigin } from "@/lib/site";

export const MEDIA_BUCKET = "media";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "png";
}

/** Same-origin link for a stored bucket path. Works on any domain. */
export function mediaUrl(path: string) {
  return `/api/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Uploads an image to the `media` bucket and returns a domain-independent link
 * that is served through this site itself (no expiring tokens).
 */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Use a PNG, JPG, WEBP, AVIF, GIF or SVG image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 5MB. Compress it and try again.");
  }

  const path = `${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return mediaUrl(path);
}

/**
 * Normalises any stored image value into something the browser can load on the
 * current domain: legacy signed/public storage links are rewritten to the
 * same-origin proxy, external links and bundled assets pass through untouched.
 */
export function imageSrc(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  // Legacy Supabase storage links (signed or public) -> same-origin proxy.
  const match = raw.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/media\/([^?]+)/);
  if (match?.[1]) return mediaUrl(decodeURIComponent(match[1]));

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("/")) {
    return raw;
  }

  // Bare bucket path, e.g. "products/abc.png".
  return mediaUrl(raw);
}

/** Absolute variant for emails, receipts and printed documents. */
export function absoluteImageSrc(value?: string | null, origin = siteOrigin()): string | null {
  const src = imageSrc(value);
  if (!src) return null;
  return src.startsWith("/") ? `${origin}${src}` : src;
}
