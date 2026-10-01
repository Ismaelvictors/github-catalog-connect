import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import {
  stockBadge,
  stockSummary,
  type AdminProduct,
} from "@/lib/admin/products";
import type { Category } from "@/lib/dzamp/types";

const BADGE_LABEL = {
  ok: "Em estoque",
  low: "Estoque baixo",
  out: "Esgotado",
} as const;

export function ProductList({
  products,
  onEdit,
  onToggleActive,
  onDelete,
  onCreate,
}: {
  products: AdminProduct[];
  onEdit: (p: AdminProduct) => void;
  onToggleActive: (p: AdminProduct) => void;
  onDelete: (p: AdminProduct) => void;
  onCreate: () => void;
}) {
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const byCat = category === "all" || p.category === category;
      const byTerm = !term || p.title.toLowerCase().includes(term);
      return byCat && byTerm;
    });
  }, [products, category, search]);

  return (
    <div className="admin-list">
      <div className="admin-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as Category | "all")}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          Novo produto
        </button>
      </div>

      <div className="admin-product-grid">
        {filtered.map((p) => {
          const badge = stockBadge(p.stock);
          return (
            <article key={p.id} className={`admin-product-card ${p.isActive ? "" : "is-inactive"}`}>
              <div className="admin-product-media">
                <img src={p.images[0] ?? "/images/placeholder.png"} alt={p.title} />
                <span className={`stock-badge stock-${badge}`}>{BADGE_LABEL[badge]}</span>
                {!p.isActive && <span className="inactive-badge">Pausado</span>}
              </div>
              <div className="admin-product-body">
                <h3>{p.title}</h3>
                <p className="muted">{CATEGORY_LABELS[p.category]}</p>
                <p className="admin-prices">
                  <strong>{formatBRL(p.price)}</strong>
                  {p.wholesalePrice > 0 && p.wholesalePrice < p.price && (
                    <span className="muted"> · Atacado {formatBRL(p.wholesalePrice)}</span>
                  )}
                </p>
                <p className="admin-stock-line muted">{stockSummary(p.stock)}</p>
                <div className="admin-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => onEdit(p)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => onToggleActive(p)}>
                    {p.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmId(p.id)}>
                    Excluir
                  </button>
                </div>
              </div>

              {confirmId === p.id && (
                <div className="admin-confirm">
                  <p>Excluir <strong>{p.title}</strong>?</p>
                  <div className="admin-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmId(null)}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setConfirmId(null);
                        onDelete(p);
                      }}
                    >
                      Confirmar exclusão
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="muted admin-empty">Nenhum produto encontrado.</p>}
    </div>
  );
}
