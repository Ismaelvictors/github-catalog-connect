import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABELS } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import { IMAGE_BUCKET, STORAGE_PREFIX } from "@/lib/dzamp/settings";
import type { Category } from "@/lib/dzamp/types";
import { ProductForm, type AdminProduct } from "@/components/dzamp/admin/ProductForm";
import { SettingsPanel } from "@/components/dzamp/admin/SettingsPanel";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do lojista — DZAMP" },
      { name: "description", content: "Gerencie produtos, estoque e regras comerciais da DZAMP." },
      { property: "og:title", content: "Painel do lojista — DZAMP" },
      { property: "og:description", content: "Gerencie produtos, estoque e regras comerciais da DZAMP." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const LOW_STOCK = 5;

async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const [p, s] = await Promise.all([
    supabase
      .from("products")
      .select("id,title,description,price,wholesale_price,category,images,is_active,sort_order,created_at")
      .order("sort_order")
      .order("created_at", { ascending: false }),
    supabase.from("product_stock").select("product_id,size,quantity,sort_order").order("sort_order"),
  ]);
  if (p.error) throw p.error;
  const paths = (p.data ?? [])
    .flatMap((r) => (Array.isArray(r.images) ? r.images.map(String) : []))
    .filter((i) => i.startsWith(STORAGE_PREFIX))
    .map((i) => i.slice(STORAGE_PREFIX.length));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }
  return (p.data ?? []).map((r) => {
    const raw = Array.isArray(r.images) ? r.images.map(String) : [];
    const first = raw[0] ?? "";
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      price: Number(r.price),
      wholesalePrice: Number(r.wholesale_price),
      category: r.category as Category,
      isActive: r.is_active,
      imageRaw: first,
      imageUrl: first.startsWith(STORAGE_PREFIX) ? (signed.get(first.slice(STORAGE_PREFIX.length)) ?? "") : first,
      stock: (s.data ?? []).filter((x) => x.product_id === r.id).map((x) => ({ size: x.size, quantity: x.quantity })),
    };
  });
}

function stockStatus(p: AdminProduct): "out" | "low" | "ok" {
  if (!p.stock.length || p.stock.every((s) => s.quantity <= 0)) return "out";
  if (p.stock.some((s) => s.quantity < LOW_STOCK)) return "low";
  return "ok";
}

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"produtos" | "config">("produtos");
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminProduct | null>(null);

  useEffect(() => {
    supabase.rpc("claim_owner_admin").then(({ data }) => setAuthorized(!!data));
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: fetchAdminProducts,
    enabled: authorized === true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (!q || p.title.toLowerCase().includes(q)) &&
        (!onlyAlerts || stockStatus(p) !== "ok"),
    );
  }, [products, search, cat, onlyAlerts]);

  const outCount = products.filter((p) => stockStatus(p) === "out").length;
  const lowCount = products.filter((p) => stockStatus(p) === "low").length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["catalog"] });
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const toggleActive = async (p: AdminProduct) => {
    await supabase.from("products").update({ is_active: !p.isActive }).eq("id", p.id);
    refresh();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    await supabase.from("products").delete().eq("id", confirmDelete.id);
    if (confirmDelete.imageRaw.startsWith(STORAGE_PREFIX))
      await supabase.storage.from(IMAGE_BUCKET).remove([confirmDelete.imageRaw.slice(STORAGE_PREFIX.length)]);
    setConfirmDelete(null);
    refresh();
  };

  if (authorized === null) return <main className="admin-shell"><p className="muted">Carregando...</p></main>;
  if (!authorized)
    return (
      <main className="admin-shell">
        <p>Esta conta não tem acesso ao painel.</p>
        <button className="btn btn-primary" onClick={signOut}>Sair</button>
      </main>
    );

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <div className="admin-brand">
          <img src="/images/logo.png" alt="DZAMP" />
          <strong>Painel do lojista</strong>
        </div>
        <div className="admin-top-actions">
          <a href="/" target="_blank" rel="noreferrer" className="admin-link">Ver loja</a>
          <button className="admin-link" onClick={signOut}>Sair</button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className={tab === "produtos" ? "active" : ""} onClick={() => setTab("produtos")}>Produtos</button>
        <button className={tab === "config" ? "active" : ""} onClick={() => setTab("config")}>Configurações</button>
      </nav>

      {tab === "config" ? (
        <SettingsPanel onSaved={() => qc.invalidateQueries({ queryKey: ["catalog"] })} />
      ) : (
        <>
          {(outCount > 0 || lowCount > 0) && (
            <div className="admin-alert">
              {outCount > 0 && <span>🔴 {outCount} {outCount === 1 ? "produto esgotado" : "produtos esgotados"}</span>}
              {lowCount > 0 && <span>🟡 {lowCount} com estoque baixo</span>}
              <button className="admin-link" onClick={() => setOnlyAlerts((v) => !v)}>
                {onlyAlerts ? "Ver todos" : "Ver apenas alertas"}
              </button>
            </div>
          )}
          <div className="admin-toolbar">
            <input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select value={cat} onChange={(e) => setCat(e.target.value as Category | "all")}>
              <option value="all">Todas as linhas</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => setEditing("new")}>+ Novo produto</button>
          </div>

          {isLoading ? (
            <p className="muted">Carregando produtos...</p>
          ) : filtered.length === 0 ? (
            <p className="muted">Nenhum produto encontrado.</p>
          ) : (
            <div className="admin-list">
              {filtered.map((p) => {
                const st = stockStatus(p);
                return (
                  <article key={p.id} className={`admin-item ${p.isActive ? "" : "admin-item-off"}`}>
                    {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <div className="admin-noimg">Sem foto</div>}
                    <div className="admin-item-info">
                      <div className="admin-item-head">
                        <strong>{p.title}</strong>
                        <span className={`stock-badge stock-${st}`}>
                          {st === "out" ? "Esgotado" : st === "low" ? "Estoque baixo" : "Em estoque"}
                        </span>
                      </div>
                      <span className="muted">
                        {CATEGORY_LABELS[p.category]} · {formatBRL(p.price)} · Atacado {formatBRL(p.wholesalePrice)}
                        {!p.isActive && " · Oculto na loja"}
                      </span>
                      <div className="admin-stock-row">
                        {p.stock.length === 0 ? (
                          <span className="muted">Sem tamanhos cadastrados</span>
                        ) : (
                          p.stock.map((s) => (
                            <span key={s.size} className={s.quantity <= 0 ? "zero" : s.quantity < LOW_STOCK ? "low" : ""}>
                              {s.size}: {s.quantity}
                            </span>
                          ))
                        )}
                      </div>
                      <div className="admin-item-actions">
                        <button onClick={() => setEditing(p)}>Editar</button>
                        <button onClick={() => toggleActive(p)}>{p.isActive ? "Ocultar" : "Mostrar"}</button>
                        <button className="danger" onClick={() => setConfirmDelete(p)}>Excluir</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal admin-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>Excluir produto?</h3>
            <p>“{confirmDelete.title}” será removido definitivamente, junto com seu estoque.</p>
            <div className="admin-confirm-actions">
              <button className="btn" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={doDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
