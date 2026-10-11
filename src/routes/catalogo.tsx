import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Filter, Search } from "lucide-react";
import { catalogQueryOptions } from "@/lib/catalog.functions";
import { CategoryChips } from "@/components/dzamp/product-controls";
import { ProductCard } from "@/components/dzamp/ProductCard";
import { ProductModal } from "@/components/dzamp/ProductModal";
import { useCart } from "@/components/dzamp/cart";
import { CATEGORY_LABELS } from "@/lib/dzamp/lines";
import type { Category, Product } from "@/lib/dzamp/types";

const CATALOG_CATEGORIES: Category[] = ["jovem", "infantil", "adulto", "uv"];

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo — DZAMP" },
      {
        name: "description",
        content:
          "Explore o catálogo DZAMP: linhas Infantil, Jovem, Adulto e UV Manga Longa. Escolha o tamanho e peça pelo WhatsApp.",
      },
      { property: "og:title", content: "Catálogo — DZAMP" },
      {
        property: "og:description",
        content: "Peças premium das linhas Infantil, Jovem, Adulto e UV. Pedido direto no WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

  const productSections = useMemo(() => {
    if (category !== "all") return [{ category, products }];
    return CATALOG_CATEGORIES
      .map((sectionCategory) => ({
        category: sectionCategory,
        products: products.filter((product) => product.category === sectionCategory),
      }))
      .filter((section) => section.products.length > 0);
  }, [category, products]);

  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <h1>Catálogo</h1>
        </div>

        <div className="catalog-toolbar">
          <div className="search-field">
            <Search size={18} strokeWidth={2} aria-hidden="true" />
            <input
              className="search-input"
              type="search"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar produto"
            />
          </div>
          <button
            className={`filters-toggle ${filtersOpen ? "filters-toggle-open" : ""}`}
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <Filter size={16} strokeWidth={2.4} aria-hidden="true" />
            Filtros avançados
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
          <div className="catalog-sections">
            {productSections.map((section) => (
              <section className="catalog-category-section" key={section.category}>
                <h2>{CATEGORY_LABELS[section.category]}</h2>
                <div className="grid">
                  {section.products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onDetails={() => setSelected(p)}
                      settings={data.settings}
                      onAdd={(item) => add(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <ProductModal product={selected} settings={data.settings} onClose={() => setSelected(null)} onAdd={(i) => add(i)} />
      )}
    </main>
  );
}
