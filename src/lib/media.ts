import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";
const TEN_YEARS = 60 * 60 * 24 * 3650;

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "png";
}

/**
 * Uploads an image to the private `media` bucket and returns a long-lived
 * signed URL that can be stored on products, categories, brands or settings.
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

  const { data, error: signError } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw new Error(signError?.message ?? "Could not create an image link.");
  return data.signedUrl;
}
