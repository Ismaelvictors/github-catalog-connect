import { useCallback, useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { logoutAdmin, requireAdminSession } from "@/lib/admin/auth";
import {
  deleteProduct,
  listAdminProducts,
  saveProduct,
  setProductActive,
  type AdminProduct,
  type SaveProductInput,
} from "@/lib/admin/products";
import { loadAdminSettings, saveAdminSettings } from "@/lib/admin/settings";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductList } from "@/components/admin/ProductList";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import type { StoreSettings } from "@/lib/dzamp/types";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const ok = await requireAdminSession();
    if (!ok) throw redirect({ to: "/admin/login" });
  },
  head: () => ({
    meta: [
      { title: "Painel — DZAMP" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPanelPage,
});

type Tab = "products" | "settings";
type Mode = "list" | "form";

function AdminPanelPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("products");
  const [mode, setMode] = useState<Mode>("list");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, s] = await Promise.all([listAdminProducts(), loadAdminSettings()]);
      setProducts(p);
      setSettings(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar painel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLogout = async () => {
    await logoutAdmin();
    await navigate({ to: "/admin/login" });
  };

  const handleSave = async (input: SaveProductInput) => {
    await saveProduct(input);
    setMode("list");
    setEditing(null);
    await refresh();
  };

  return (
    <main className="admin admin-panel">
      <header className="admin-header admin-head">
        <div>
          <p className="admin-eyebrow">DZAMP</p>
          <h1>Painel da loja</h1>
        </div>
        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <nav className="admin-tabs" aria-label="Seções do painel">
        <button
          type="button"
          className={tab === "products" ? "tab-active" : ""}
          onClick={() => {
            setTab("products");
            setMode("list");
            setEditing(null);
          }}
        >
          Produtos
        </button>
        <button
          type="button"
          className={tab === "settings" ? "tab-active" : ""}
          onClick={() => {
            setTab("settings");
            setMode("list");
            setEditing(null);
          }}
        >
          Configurações
        </button>
      </nav>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="muted">Carregando...</p>}

      {!loading && tab === "products" && mode === "list" && (
        <ProductList
          products={products}
          onCreate={() => {
            setEditing(null);
            setMode("form");
          }}
          onEdit={(p) => {
            setEditing(p);
            setMode("form");
          }}
          onToggleActive={async (p) => {
            await setProductActive(p.id, !p.isActive);
            await refresh();
          }}
          onDelete={async (p) => {
            await deleteProduct(p.id);
            await refresh();
          }}
        />
      )}

      {!loading && tab === "products" && mode === "form" && (
        <ProductForm
          product={editing}
          onCancel={() => {
            setMode("list");
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {!loading && tab === "settings" && settings && (
        <SettingsPanel
          initial={settings}
          onSave={async (next) => {
            await saveAdminSettings(next);
            setSettings(next);
          }}
        />
      )}
    </main>
  );
}
