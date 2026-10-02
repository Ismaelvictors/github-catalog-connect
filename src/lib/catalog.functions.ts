import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { Category, Product } from "@/lib/dzamp/types";
import { IMAGE_BUCKET, parseSettings, STORAGE_PREFIX } from "@/lib/dzamp/settings";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  return [];
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const [productsRes, stockRes, settingsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id,title,description,price,wholesale_price,category,images,sort_order,created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("product_stock").select("product_id,size,quantity,sort_order").order("sort_order"),
    supabase.from("settings").select("key,value"),
  ]);

  if (productsRes.error) {
    console.error("Falha ao carregar produtos:", productsRes.error.message);
    throw new Error("Erro ao carregar produtos");
  }

  // Sign private storage images (long-lived)
  const paths = new Set<string>();
  for (const row of productsRes.data ?? [])
    for (const img of toStringArray(row.images))
      if (img.startsWith(STORAGE_PREFIX)) paths.add(img.slice(STORAGE_PREFIX.length));
  const signed = new Map<string, string>();
  if (paths.size) {
    const { data } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls([...paths], 60 * 60 * 24 * 7);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const stockBy = new Map<string, { size: string; quantity: number }[]>();
  for (const s of stockRes.data ?? []) {
    const list = stockBy.get(s.product_id) ?? [];
    list.push({ size: s.size, quantity: s.quantity });
    stockBy.set(s.product_id, list);
  }

  const products: Product[] = (productsRes.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    wholesalePrice: Number(row.wholesale_price ?? 0),
    category: row.category as Category,
    images: toStringArray(row.images).map((img) =>
      img.startsWith(STORAGE_PREFIX) ? (signed.get(img.slice(STORAGE_PREFIX.length)) ?? "") : img,
    ),
    stock: stockBy.get(row.id) ?? [],
  }));

  return { products, settings: parseSettings(settingsRes.data ?? []) };
});

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 30_000,
});

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        size: z.string().min(1).max(40),
        qty: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(200),
});

export type PlaceOrderResult =
  | { ok: true; code: string; subtotal: number; discount: number; total: number }
  | { ok: false; reason: "stock"; problems: { product_id: string; size: string; available: number }[] }
  | { ok: false; reason: "minimum"; minimum: number };

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: res, error } = await supabase.rpc("place_order", { _items: data.items });
    if (error) {
      console.error("place_order:", error.message);
      throw new Error("Não foi possível registrar o pedido. Tente novamente.");
    }
    return res as unknown as PlaceOrderResult;
  });
