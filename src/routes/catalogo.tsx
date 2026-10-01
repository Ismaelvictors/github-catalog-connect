import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import { catalogQueryOptions } from "@/lib/catalog.functions";
import { CategoryChips } from "@/components/dzamp/product-controls";
import { ProductCard } from "@/components/dzamp/ProductCard";
import { ProductModal } from "@/components/dzamp/ProductModal";
import { useCart } from "@/components/dzamp/cart";
import type { Category, Product } from "@/lib/dzamp/types";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo — DZAMP" },
      {
        name: "description",
        content:
          "Explore o catálogo DZAMP: linhas Infantil, Jovem, Adulto e UV Manga Longa. Escolha tamanho e peça pelo WhatsApp.",
      },
      { property: "og:title", content: "Catálogo — DZAMP" },
      {
        property: "og:description",
        content: "Peças premium das linhas Infantil, Jovem, Adulto e UV. Pedido direto no WhatsApp.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  component: CatalogPage,
});

function CatalogPage() {
  const { data } = useSuspenseQuery(catalogQueryOptions);
  const { add } = useCart();
  const [category, setCategory] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const products = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.products.filter((p) => {
      const byCat = category === "all" || p.category === category;
      const byTerm =
        !term || p.title.toLowerCase().includes(term) || p.description.toLowerCase().includes(term);
      return byCat && byTerm;
    });
  }, [data.products, category, search]);

  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <h1>Catálogo</h1>
        </div>

        <div className="catalog-toolbar">
          <input
            className="search-input"
            type="search"
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar produto"
          />
          <button
            className={`filters-toggle ${filtersOpen ? "filters-toggle-open" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <Filter size={16} strokeWidth={2.4} aria-hidden="true" />
            Filtros
          </button>
        </div>

        {filtersOpen && (
          <div className="filters-panel">
            <CategoryChips active={category} onChange={setCategory} />
          </div>
        )}

        {products.length === 0 ? (
          <p className="empty-state">Nenhum produto encontrado para esta busca.</p>
        ) : (
          <div className="grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                settings={data.settings}
                onDetails={() => setSelected(p)}
                onAdd={(item) => add(item)}
              />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <ProductModal
          product={selected}
          settings={data.settings}
          onClose={() => setSelected(null)}
          onAdd={(i) => add(i)}
        />
      )}
    </main>
  );
}
