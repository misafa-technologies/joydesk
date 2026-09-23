import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { imageSrc, mediaPath, signedMediaUrl } from "@/lib/media";

const signedCache = new Map<string, string>();

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

/** Image element that refreshes private storage links directly in the browser. */
export function MediaImage({ src, onError, ...props }: MediaImageProps) {
  const path = mediaPath(src);
  const cached = path ? signedCache.get(path) : undefined;
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => cached ?? (path ? null : imageSrc(src)));

  useEffect(() => {
    let active = true;
    const nextPath = mediaPath(src);

    if (!nextPath) {
      setResolvedSrc(imageSrc(src));
      return () => {
        active = false;
      };
    }

    const existing = signedCache.get(nextPath);
    if (existing) {
      setResolvedSrc(existing);
      return () => {
        active = false;
      };
    }

    setResolvedSrc(null);
    signedMediaUrl(src)
      .then((url) => {
        if (!active || !url) return;
        signedCache.set(nextPath, url);
        setResolvedSrc(url);
      })
      .catch(() => {
        if (active) setResolvedSrc(imageSrc(src));
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (!resolvedSrc) return null;

  return <img {...props} src={resolvedSrc} onError={onError} />;
}