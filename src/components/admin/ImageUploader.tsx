import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImage, imageSrc } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  /** Current image URLs. */
  value: string[];
  onChange: (urls: string[]) => void;
  /** Storage folder, e.g. "products". */
  folder: string;
  /** Allow more than one image. */
  multiple?: boolean;
  label?: string;
  hint?: string;
}

/** Upload-first image picker with an optional paste-a-URL fallback. */
export function ImageUploader({ value, onChange, folder, multiple = false, label = "Images", hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const list = multiple ? Array.from(files) : [files[0]!];
      const uploaded: string[] = [];
      for (const file of list) uploaded.push(await uploadImage(file, folder));
      onChange(multiple ? [...value, ...uploaded] : uploaded);
      toast.success(uploaded.length > 1 ? `${uploaded.length} images uploaded` : "Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange(multiple ? [...value, url] : [url]);
    setUrlDraft("");
    setShowUrl(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Upload
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrl((s) => !s)}>
            <Link2 className="h-4 w-4" /> URL
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {showUrl && (
        <div className="flex gap-2">
          <Input
            value={urlDraft}
            placeholder="https://…"
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <Button type="button" size="sm" onClick={addUrl}>
            Add
          </Button>
        </div>
      )}

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {value.map((url) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border bg-muted">
              <img src={imageSrc(url) ?? url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-destructive/90 py-1 text-destructive-foreground opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-4 w-4" /> Click to upload
        </button>
      )}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
