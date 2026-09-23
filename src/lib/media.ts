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

/** Returns the bucket-relative path from legacy links, proxy links or bare paths. */
export function mediaPath(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const storageMatch = raw.match(/\/storage\/v1\/object\/(?:sign|public|authenticated)\/media\/([^?]+)/);
  const proxyMatch = raw.match(/\/api\/public\/media\/([^?]+)/);
  const encodedPath = storageMatch?.[1] ?? proxyMatch?.[1];
  if (encodedPath) {
    try {
      return decodeURIComponent(encodedPath).replace(/^\/+/, "");
    } catch {
      return encodedPath.replace(/^\/+/, "");
    }
  }

  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/")) {
    return null;
  }

  return raw.replace(/^\/+/, "");
}

/** Creates a fresh storage-signed URL without depending on the website host. */
export async function signedMediaUrl(value?: string | null): Promise<string | null> {
  const path = mediaPath(value);
  if (!path) return imageSrc(value);

  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (error) throw new Error(error.message);
  return data.signedUrl;
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
  const path = mediaPath(raw);
  if (path) return mediaUrl(path);

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
