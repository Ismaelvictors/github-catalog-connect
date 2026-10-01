import { useState } from "react";
import { CATEGORY_LABELS, lineFor } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import type { CartItem, Product, StoreSettings } from "@/lib/dzamp/types";
import {
  firstAvailableIfSingle,
  isSoldOut,
  QtyStepper,
  SizeSelect,
  WholesaleHint,
} from "./product-controls";

export function ProductCard({
  product,
  settings,
  onDetails,
  onAdd,
}: {
  product: Product;
  settings: StoreSettings;
  onDetails: () => void;
  onAdd: (item: Omit<CartItem, "key">) => void;
}) {
  const line = lineFor(product.category);
  const soldOut = isSoldOut(product.stock);
  const [size, setSize] = useState<string | null>(() => firstAvailableIfSingle(product.stock));
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const maxQty = size
    ? Math.max(1, product.stock.find((s) => s.size === size)?.quantity ?? 1)
    : 99;

  const handleAdd = () => {
    if (soldOut) return;
    if (!size) {
      setSizeError(true);
      return;
    }
    onAdd({
      productId: product.id,
      title: product.title,
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      category: product.category,
      size,
      qty: Math.min(qty, maxQty),
      image: product.images[0] ?? "",
    });
    setSize(firstAvailableIfSingle(product.stock));
    setQty(1);
    setSizeError(false);
  };

  return (
    <article className={`card ${soldOut ? "card-soldout" : ""}`}>
      <button
        className="card-media"
        onClick={onDetails}
        aria-label={`Ver detalhes de ${product.title}`}
      >
        <img src={product.images[0] ?? ""} alt={product.title} loading="lazy" />
        <span className={`cat-tag cat-${product.category}`}>
          {CATEGORY_LABELS[product.category]}
        </span>
        {soldOut && <span className="soldout-seal">Esgotado</span>}
      </button>
      <div className="card-body">
        <h3>{product.title}</h3>
        <p className="card-price">{formatBRL(product.price)}</p>
        <WholesaleHint product={product} settings={settings} />

        <div className="card-selects">
          <SizeSelect
            id={`card-size-${product.id}`}
            stock={product.stock}
            value={size}
            onChange={(s) => {
              setSize(s);
              setSizeError(false);
              setQty(1);
            }}
            error={sizeError}
            note={sizeError ? "Selecione um tamanho." : line.sizesNote}
            disabled={soldOut}
          />
          <div className="card-buy-row">
            <QtyStepper value={qty} onChange={setQty} small max={maxQty} />
            <button
              className="btn btn-primary card-add"
              onClick={handleAdd}
              disabled={soldOut}
            >
              {soldOut ? "Esgotado" : "Adicionar"}
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
