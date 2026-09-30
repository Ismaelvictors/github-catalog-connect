import { useState } from "react";
import { CATEGORY_LABELS, lineFor, sizesFor } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import type { CartItem, Product } from "@/lib/dzamp/types";
import { ColorSelect, EstampaSelect, QtyStepper, SizeSelect } from "./product-controls";

export function ProductCard({
  product,
  onDetails,
  onAdd,
}: {
  product: Product;
  onDetails: () => void;
  onAdd: (item: Omit<CartItem, "key">) => void;
}) {
  const line = lineFor(product.category);
  const [color, setColor] = useState(line.colors[0]?.name ?? "");
  const [estampa, setEstampa] = useState(line.estampas[0] ?? "");
  const [size, setSize] = useState<string | null>(line.sizes.length === 1 ? (line.sizes[0] ?? null) : null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const sizes = sizesFor(product.category);

  const handleAdd = () => {
    if (!size) {
      setSizeError(true);
      return;
    }
    onAdd({
      productId: product.id,
      title: product.title,
      price: product.price,
      size,
      color,
      estampa: line.hasEstampa ? estampa : "",
      note: "",
      qty,
      image: product.images[0] ?? "",
    });
    setSize(line.sizes.length === 1 ? (line.sizes[0] ?? null) : null);
    setQty(1);
    setSizeError(false);
  };

  return (
    <article className="card">
      <button
        className="card-media"
        onClick={onDetails}
        aria-label={`Ver detalhes de ${product.title}`}
      >
        <img src={product.images[0] ?? ""} alt={product.title} loading="lazy" />
        <span className={`cat-tag cat-${product.category}`}>
          {CATEGORY_LABELS[product.category]}
        </span>
      </button>
      <div className="card-body">
        <h3>{product.title}</h3>
        <p className="card-price">{formatBRL(product.price)}</p>

        <div className="card-selects">
          <ColorSelect
            id={`card-color-${product.id}`}
            value={color}
            colors={line.colors}
            onChange={setColor}
          />
          {line.hasEstampa && (
            <EstampaSelect
              id={`card-estampa-${product.id}`}
              value={estampa}
              estampas={line.estampas}
              onChange={setEstampa}
            />
          )}
          <SizeSelect
            id={`card-size-${product.id}`}
            sizes={sizes}
            value={size}
            onChange={(s) => {
              setSize(s);
              setSizeError(false);
            }}
            error={sizeError}
            note={sizeError ? "Selecione um tamanho." : undefined}
            singleLabel={line.sizesSelectLabel}
          />
          <div className="card-buy-row">
            <QtyStepper value={qty} onChange={setQty} small />
            <button className="btn btn-primary card-add" onClick={handleAdd}>
              Adicionar
            </button>
          </div>
          <button className="card-details-link" onClick={onDetails}>
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  );
}
