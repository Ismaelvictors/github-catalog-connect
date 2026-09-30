import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Category, Product } from "@/lib/dzamp/types";

const DEFAULT_WHATSAPP = "5500999999999";

function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const [productsRes, settingsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id,title,description,price,category,images,sizes,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("settings").select("key,value").eq("key", "whatsapp_number").maybeSingle(),
  ]);

  if (productsRes.error) {
    console.error("Falha ao carregar produtos:", productsRes.error.message);
    throw new Error("Erro ao carregar produtos");
  }

  const products: Product[] = (productsRes.data ?? []).map((row) => ({
    id: String(row.id),
    title: row.title,
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    category: row.category as Category,
    images: toStringArray(row.images),
    sizes: toStringArray(row.sizes),
  }));

  return {
    products,
    whatsappNumber: settingsRes.data?.value || DEFAULT_WHATSAPP,
  };
});

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 60_000,
});
