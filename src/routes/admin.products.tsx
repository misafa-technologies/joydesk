import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MediaImage } from "@/components/site/MediaImage";
import { formatKES } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Minus } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ImageUploader } from "@/components/admin/ImageUploader";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Products — JoyDesk Admin" },
      { name: "description", content: "Manage products, categories and brands for the JoyDesk catalogue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProducts,
});

type Product = Database["public"]["Tables"]["products"]["Row"];
type Category = Database["public"]["Tables"]["categories"]["Row"];
type Brand = Database["public"]["Tables"]["brands"]["Row"];

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const EMPTY_FORM = {
  id: "",
  name: "",
  slug: "",
  short_description: "",
  description: "",
  price: "0",
  compare_price: "",
  sku: "",
  stock: "0",
  low_stock_threshold: "5",
  category_id: "",
  brand_id: "",
  images: "",
  features: "",
  specs: "{}",
  tag: "",
  is_featured: false,
  is_active: true,
};

function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data as Brand[];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const categoryName = (id: string | null) => categories?.find((c) => c.id === id)?.name ?? "—";

  const saveMutation = useMutation({
    mutationFn: async () => {
      let specs: Record<string, unknown> = {};
      try {
        specs = form.specs.trim() ? JSON.parse(form.specs) : {};
      } catch {
        throw new Error("Specs must be valid JSON");
      }
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        short_description: form.short_description || null,
        description: form.description || null,
        price: Number(form.price) || 0,
        compare_price: form.compare_price ? Number(form.compare_price) : null,
        sku: form.sku || null,
        stock: Number(form.stock) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        images: form.images
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        features: form.features
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        specs: specs as Record<string, string>,
        tag: form.tag || null,
        is_featured: form.is_featured,
        is_active: form.is_active,
      };
      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? "Product updated" : "Product created");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      setDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stockMutation = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("products").update({ stock: Math.max(0, stock) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      short_description: p.short_description ?? "",
      description: p.description ?? "",
      price: String(p.price),
      compare_price: p.compare_price != null ? String(p.compare_price) : "",
      sku: p.sku ?? "",
      stock: String(p.stock),
      low_stock_threshold: String(p.low_stock_threshold),
      category_id: p.category_id ?? "",
      brand_id: p.brand_id ?? "",
      images: (p.images ?? []).join("\n"),
      features: (p.features ?? []).join("\n"),
      specs: JSON.stringify(p.specs ?? {}, null, 2),
      tag: p.tag ?? "",
      is_featured: p.is_featured,
      is_active: p.is_active,
    });
    setSlugEdited(true);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Products</h2>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="taxonomy">Categories & Brands</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-1 h-4 w-4" /> New product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }));
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        setForm((f) => ({ ...f, slug: e.target.value }));
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Short description</Label>
                    <Input value={form.short_description} onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Price (KES)</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Compare price</Label>
                    <Input type="number" value={form.compare_price} onChange={(e) => setForm((f) => ({ ...f, compare_price: e.target.value }))} />
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Tag</Label>
                    <Input value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Low stock threshold</Label>
                    <Input
                      type="number"
                      value={form.low_stock_threshold}
                      onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Brand</Label>
                    <Select value={form.brand_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, brand_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {brands?.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <ImageUploader
                      label="Images"
                      multiple
                      folder="products"
                      value={form.images ? form.images.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : []}
                      onChange={(urls) => setForm((f) => ({ ...f, images: urls.join("\n") }))}
                      hint="Upload one or more product photos, or paste image URLs."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Features (one per line)</Label>
                    <Textarea rows={3} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Specs (JSON key/value)</Label>
                    <Textarea rows={4} className="font-mono text-xs" value={form.specs} onChange={(e) => setForm((f) => ({ ...f, specs: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                    <Label htmlFor="featured">Featured</Label>
                    <Switch id="featured" checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                    <Label htmlFor="active">Active</Label>
                    <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
                    {saveMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : !filtered.length ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No products found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.images?.[0] ? (
                            <MediaImage src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-md border border-border object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-md border border-dashed border-border bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-56 truncate font-medium">{p.name}</TableCell>
                        <TableCell>{categoryName(p.category_id)}</TableCell>
                        <TableCell>{formatKES(p.price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => stockMutation.mutate({ id: p.id, stock: p.stock - 1 })}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              className="h-6 w-14 text-center"
                              value={p.stock}
                              onChange={(e) => stockMutation.mutate({ id: p.id, stock: Number(e.target.value) || 0 })}
                            />
                            <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => stockMutation.mutate({ id: p.id, stock: p.stock + 1 })}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            {p.stock <= p.low_stock_threshold && <Badge variant="destructive">Low</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? "secondary" : "outline"}>{p.is_active ? "Active" : "Hidden"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete product?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove "{p.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxonomy">
          <TaxonomyManager categories={categories ?? []} brands={brands ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaxonomyManager({ categories, brands }: { categories: Category[]; brands: Brand[] }) {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [editingCategoryImage, setEditingCategoryImage] = useState<string | null>(null);
  const [editingBrandLogo, setEditingBrandLogo] = useState<string | null>(null);

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("categories").insert({ name, slug: slugify(name) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      setNewCategory("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const renameCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("categories").update({ name, slug: slugify(name) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCategoryImage = useMutation({
    mutationFn: async ({ id, image_url }: { id: string; image_url: string | null }) => {
      const { error } = await supabase.from("categories").update({ image_url }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category image updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createBrand = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("brands").insert({ name, slug: slugify(name) });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand created");
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
      setNewBrand("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const renameBrand = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("brands").update({ name, slug: slugify(name) }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateBrandLogo = useMutation({
    mutationFn: async ({ id, logo_url }: { id: string; logo_url: string | null }) => {
      const { error } = await supabase.from("brands").update({ logo_url }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand logo updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Brand deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 p-4">
          <h3 className="font-medium text-foreground">Categories</h3>
          <div className="flex gap-2">
            <Input placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button onClick={() => newCategory.trim() && createCategory.mutate(newCategory.trim())} disabled={createCategory.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="space-y-2 rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategoryImage((cur) => (cur === c.id ? null : c.id))}
                    className="shrink-0"
                    aria-label="Edit category image"
                  >
                    {c.image_url ? (
                      <MediaImage src={c.image_url} alt={c.name} className="h-9 w-9 rounded-md border border-border object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">img</div>
                    )}
                  </button>
                  <Input
                    defaultValue={c.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && renameCategory.mutate({ id: c.id, name: e.target.value.trim() })}
                  />
                  <Button size="icon" variant="ghost" onClick={() => deleteCategory.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {editingCategoryImage === c.id && (
                  <ImageUploader
                    label="Category image"
                    folder="categories"
                    value={c.image_url ? [c.image_url] : []}
                    onChange={(urls) => updateCategoryImage.mutate({ id: c.id, image_url: urls[0] ?? null })}
                  />
                )}
              </li>
            ))}
            {!categories.length && <p className="text-sm text-muted-foreground">No categories yet.</p>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h3 className="font-medium text-foreground">Brands</h3>
          <div className="flex gap-2">
            <Input placeholder="New brand" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
            <Button onClick={() => newBrand.trim() && createBrand.mutate(newBrand.trim())} disabled={createBrand.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-2">
            {brands.map((b) => (
              <li key={b.id} className="space-y-2 rounded-md border border-border p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBrandLogo((cur) => (cur === b.id ? null : b.id))}
                    className="shrink-0"
                    aria-label="Edit brand logo"
                  >
                    {b.logo_url ? (
                      <MediaImage src={b.logo_url} alt={b.name} className="h-9 w-9 rounded-md border border-border object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">logo</div>
                    )}
                  </button>
                  <Input
                    defaultValue={b.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== b.name && renameBrand.mutate({ id: b.id, name: e.target.value.trim() })}
                  />
                  <Button size="icon" variant="ghost" onClick={() => deleteBrand.mutate(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                {editingBrandLogo === b.id && (
                  <ImageUploader
                    label="Brand logo"
                    folder="brands"
                    value={b.logo_url ? [b.logo_url] : []}
                    onChange={(urls) => updateBrandLogo.mutate({ id: b.id, logo_url: urls[0] ?? null })}
                  />
                )}
              </li>
            ))}
            {!brands.length && <p className="text-sm text-muted-foreground">No brands yet.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
