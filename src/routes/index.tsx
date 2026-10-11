import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/dzamp/ProductCard";
import { ProductModal } from "@/components/dzamp/ProductModal";
import { useCart } from "@/components/dzamp/cart";
import type { Product } from "@/lib/dzamp/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DZAMP" },
      {
        name: "description",
        content:
          "Catálogo DZAMP: camisetas, polos e manga longa com proteção UV. Linhas Infantil, Jovem, Adulto e UV, com pedido direto pelo WhatsApp.",
      },
      { property: "og:title", content: "DZAMP — Moda com identidade" },
      {
        property: "og:description",
        content: "Peças premium nas linhas Infantil, Jovem, Adulto e UV. Peça pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  component: HomePage,
});

function HomePage() {
  const { data } = useSuspenseQuery(catalogQueryOptions);
  const slides = data.carouselImages;
  const { add } = useCart();
  const [slide, setSlide] = useState(0);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setSlide((s) => (s + 1) % slides.length), 4000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const featured = data.products
    .filter((product) => product.isFeatured)
    .sort((a, b) => a.featuredOrder - b.featuredOrder);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">Moda Masculina</span>
          <h1>Estilo, conforto e elegância</h1>
          <p className="muted">
            Para os pequenos passos e as grandes conquistas.
            <br />
            Confira nosso catálogo completo e à pronta entrega.
          </p>
          <div className="hero-cta">
            <Link to="/catalogo" className="btn btn-primary">
              Ver catálogo completo
            </Link>
          </div>
        </div>

        <div className="hero-carousel-wrap">
          <div className="hero-carousel">
            <div className="hc-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {slides.map((src) => (
                <div className="hc-slide" key={src}>
                  <img src={src} alt="Peças da coleção DZAMP" />
                </div>
              ))}
            </div>
            <div className="hc-dots">
              {slides.map((src, i) => (
                <button
                  key={src}
                  className={`hc-dot ${i === slide ? "hc-dot-active" : ""}`}
                  onClick={() => setSlide(i)}
                  aria-label={`Imagem ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section home-featured">
          <div className="section-head">
            <h2>Destaques DZAMP</h2>
            <Link to="/catalogo" className="see-all">
              Ver todos →
            </Link>
          </div>
          <div className="grid featured-grid">
            {featured.map((p) => (
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
      )}

      {selected && (
        <ProductModal product={selected} settings={data.settings} onClose={() => setSelected(null)} onAdd={(i) => add(i)} />
      )}
    </main>
  );
}
