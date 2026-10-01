import { supabase } from "@/integrations/supabase/client";
import { IMAGE_BUCKET, STORAGE_PREFIX } from "@/lib/dzamp/settings";
import type { Category, Product, StockEntry } from "@/lib/dzamp/types";

export interface AdminProduct extends Product {
  isActive: boolean;
  sortOrder: number;
  /** Original DB image refs (may include storage: paths). */
  rawImages: string[];
}

function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

async function resolveImages(images: string[]): Promise<string[]> {
  const paths = images
    .filter((img) => img.startsWith(STORAGE_PREFIX))
    .map((img) => img.slice(STORAGE_PREFIX.length));
  if (!paths.length) return images;

  const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 60 * 60 * 24 * 7);
  const signed = new Map<string, string>();
  for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);

  return images.map((img) =>
    img.startsWith(STORAGE_PREFIX)
      ? (signed.get(img.slice(STORAGE_PREFIX.length)) ??
        supabase.storage.from(IMAGE_BUCKET).getPublicUrl(img.slice(STORAGE_PREFIX.length)).data.publicUrl)
      : img,
  );
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const [productsRes, stockRes] = await Promise.all([
    supabase
      .from("products")
      .select("id,title,description,price,wholesale_price,category,images,is_active,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("product_stock").select("product_id,size,quantity,sort_order").order("sort_order"),
  ]);

  if (productsRes.error) throw productsRes.error;

  const stockBy = new Map<string, StockEntry[]>();
  for (const s of stockRes.data ?? []) {
    const list = stockBy.get(s.product_id) ?? [];
    list.push({ size: s.size, quantity: s.quantity });
    stockBy.set(s.product_id, list);
  }

  const products: AdminProduct[] = [];
  for (const row of productsRes.data ?? []) {
    const rawImages = toStringArray(row.images);
    products.push({
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      price: Number(row.price ?? 0),
      wholesalePrice: Number(row.wholesale_price ?? 0),
      category: row.category as Category,
      images: await resolveImages(rawImages),
      rawImages,
      stock: stockBy.get(row.id) ?? [],
      isActive: row.is_active,
      sortOrder: row.sort_order,
    });
  }
  return products;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  return `${STORAGE_PREFIX}${path}`;
}

export interface SaveProductInput {
  id?: string;
  title: string;
  description: string;
  price: number;
  wholesalePrice: number;
  category: Category;
  images: string[];
  isActive: boolean;
  stock: StockEntry[];
}

export async function saveProduct(input: SaveProductInput): Promise<string> {
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    wholesale_price: input.wholesalePrice,
    category: input.category,
    images: input.images,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };

  let productId = input.id;
  if (productId) {
    const { error } = await supabase.from("products").update(payload).eq("id", productId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) throw error;
    productId = data.id;
  }

  await syncStock(productId, input.stock);
  return productId;
}

export async function syncStock(productId: string, stock: StockEntry[]) {
  const { data: existing, error: readError } = await supabase
    .from("product_stock")
    .select("id,size")
    .eq("product_id", productId);
  if (readError) throw readError;

  const keep = new Set(stock.map((s) => s.size));
  const toDelete = (existing ?? []).filter((e) => !keep.has(e.size)).map((e) => e.id);
  if (toDelete.length) {
    const { error } = await supabase.from("product_stock").delete().in("id", toDelete);
    if (error) throw error;
  }

  for (let i = 0; i < stock.length; i++) {
    const entry = stock[i]!;
    const { error } = await supabase.from("product_stock").upsert(
      {
        product_id: productId,
        size: entry.size,
        quantity: Math.max(0, Math.floor(entry.quantity)),
        sort_order: i,
      },
      { onConflict: "product_id,size" },
    );
    if (error) throw error;
  }
}

export async function setProductActive(id: string, isActive: boolean) {
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export type StockBadge = "ok" | "low" | "out";

export function stockBadge(stock: StockEntry[]): StockBadge {
  if (stock.length === 0 || stock.every((s) => s.quantity <= 0)) return "out";
  if (stock.some((s) => s.quantity > 0 && s.quantity < 5)) return "low";
  return "ok";
}

export function stockSummary(stock: StockEntry[]): string {
  if (!stock.length) return "Sem grade";
  return stock.map((s) => `${s.size}: ${s.quantity}`).join(" | ");
}
