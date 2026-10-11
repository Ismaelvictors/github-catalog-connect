import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/external-db-client";
import { CATEGORY_LABELS } from "@/lib/dzamp/lines";
import { IMAGE_BUCKET, STORAGE_PREFIX } from "@/lib/dzamp/settings";
import type { Category } from "@/lib/dzamp/types";

type FeaturedProduct = {
  id: string;
  title: string;
  category: Category;
  imageUrl: string;
  isFeatured: boolean;
  featuredOrder: number;
};

async function fetchProducts(): Promise<FeaturedProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,title,category,images,is_featured,featured_order,is_active,sort_order,created_at")
    .order("is_featured", { ascending: false })
    .order("featured_order")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const paths = (data ?? [])
    .filter((row) => row.is_active)
    .flatMap((row) => (Array.isArray(row.images) ? row.images.map(String) : []))
    .filter((image) => image.startsWith(STORAGE_PREFIX))
    .map((image) => image.slice(STORAGE_PREFIX.length));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: signedUrls } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 3600);
    for (const item of signedUrls ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
  }

  return (data ?? []).map((row) => {
    const first = Array.isArray(row.images) ? String(row.images[0] ?? "") : "";
    return {
      id: row.id,
      title: row.title,
      category: row.category as Category,
      imageUrl: first.startsWith(STORAGE_PREFIX) ? (signed.get(first.slice(STORAGE_PREFIX.length)) ?? "") : first,
      isFeatured: row.is_featured,
      featuredOrder: row.featured_order,
    };
  });
}

export function FeaturedProductsPanel() {
  const qc = useQueryClient();
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["admin-featured-products"],
    queryFn: fetchProducts,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const orderedFeatured = useMemo(
    () => products.filter((product) => product.isFeatured).sort((a, b) => a.featuredOrder - b.featuredOrder),
    [products],
  );

  const reload = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-featured-products"] }),
      qc.invalidateQueries({ queryKey: ["admin-products"] }),
      qc.invalidateQueries({ queryKey: ["catalog"] }),
    ]);
  };

  const toggleFeatured = async (product: FeaturedProduct) => {
    setBusyId(product.id);
    setMessage(null);
    setFailure(null);
    const nextOrder = product.isFeatured ? 0 : (Math.max(0, ...orderedFeatured.map((item) => item.featuredOrder)) + 1);
    const { error: updateError } = await supabase
      .from("products")
      .update({ is_featured: !product.isFeatured, featured_order: nextOrder })
      .eq("id", product.id);
    setBusyId(null);
    if (updateError) {
      setFailure("Não foi possível atualizar os destaques. Tente novamente.");
      return;
    }
    setMessage(product.isFeatured ? "Produto removido dos destaques." : "Produto adicionado aos destaques.");
    await reload();
  };

  const move = async (product: FeaturedProduct, direction: -1 | 1) => {
    const index = orderedFeatured.findIndex((item) => item.id === product.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedFeatured.length) return;
    const next = [...orderedFeatured];
    const current = next[index];
    const destination = next[target];
    if (!current || !destination) return;
    next[index] = destination;
    next[target] = current;
    setSavingOrder(true);
    setMessage(null);
    setFailure(null);
    const results = await Promise.all(
      next.map((item, order) => supabase.from("products").update({ featured_order: order + 1 }).eq("id", item.id)),
    );
    setSavingOrder(false);
    if (results.some((result) => result.error)) {
      setFailure("Não foi possível salvar a ordem. Tente novamente.");
      await reload();
      return;
    }
    setMessage("Ordem dos destaques atualizada.");
    await reload();
  };

  return (
    <section className="admin-featured-panel">
      <div className="admin-featured-intro">
        <div>
          <h2>Destaques da página inicial</h2>
          <p className="muted">Escolha os produtos que aparecem na seção “Destaques DZAMP” e ajuste a ordem de exibição.</p>
        </div>
        <span className="admin-featured-count">{orderedFeatured.length} selecionados</span>
      </div>

      {message && <p className="admin-featured-message" role="status">{message}</p>}
      {failure && <p className="field-error" role="alert">{failure}</p>}
      {error ? (
        <p className="field-error">Não foi possível carregar os produtos. Atualize a página para tentar novamente.</p>
      ) : isLoading ? (
        <p className="muted">Carregando produtos...</p>
      ) : products.length === 0 ? (
        <p className="muted">Cadastre produtos antes de escolher os destaques.</p>
      ) : (
        <div className="admin-featured-list">
          {products.map((product) => {
            const position = orderedFeatured.findIndex((item) => item.id === product.id);
            return (
              <article key={product.id} className={`admin-featured-item ${product.isFeatured ? "is-featured" : ""}`}>
                {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="admin-noimg">Sem foto</div>}
                <div className="admin-featured-item-info">
                  <strong>{product.title}</strong>
                  <span className="muted">{CATEGORY_LABELS[product.category]}</span>
                  {product.isFeatured && <span className="admin-featured-position">Destaque {position + 1}</span>}
                </div>
                <div className="admin-featured-actions">
                  {product.isFeatured && (
                    <>
                      <button aria-label={`Mover ${product.title} para cima`} disabled={savingOrder || position === 0} onClick={() => move(product, -1)}>↑</button>
                      <button aria-label={`Mover ${product.title} para baixo`} disabled={savingOrder || position === orderedFeatured.length - 1} onClick={() => move(product, 1)}>↓</button>
                    </>
                  )}
                  <button
                    className={product.isFeatured ? "remove-featured" : "add-featured"}
                    disabled={busyId === product.id || savingOrder}
                    onClick={() => toggleFeatured(product)}
                  >
                    {busyId === product.id ? "Salvando..." : product.isFeatured ? "Remover" : "Destacar"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
