import { useState } from "react";
import { CATEGORY_LABELS } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import type { CartItem, Product, StoreSettings } from "@/lib/dzamp/types";
import { firstAvailableIfSingle, isSoldOut, QtyStepper, SizeSelect, WholesaleHint } from "./product-controls";

export function toCartItem(product: Product, size: string, qty: number): Omit<CartItem, "key"> {
  return {
    productId: product.id,
    title: product.title,
    price: product.price,
    wholesalePrice: product.wholesalePrice,
    category: product.category,
    size,
    qty,
    image: product.images[0] ?? "",
  };
}

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
  const soldOut = isSoldOut(product.stock);
  const [size, setSize] = useState<string | null>(firstAvailableIfSingle(product.stock));
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const available = product.stock.find((s) => s.size === size)?.quantity ?? 99;

  const handleAdd = () => {
    if (!size) return setError("Selecione um tamanho.");
    if (qty > available) return setError(`Apenas ${available} em estoque.`);
    onAdd(toCartItem(product, size, qty));
    setSize(firstAvailableIfSingle(product.stock));
    setQty(1);
    setError(null);
  };

  return (
    <article className={`card ${soldOut ? "card-soldout" : ""}`}>
      <button className="card-media" onClick={onDetails} aria-label={`Ver detalhes de ${product.title}`}>
        <img src={product.images[0] ?? ""} alt={product.title} loading="lazy" />
        <span className={`cat-tag cat-${product.category}`}>{CATEGORY_LABELS[product.category]}</span>
        {soldOut && <span className="soldout-badge">Esgotado</span>}
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
            disabled={soldOut}
            onChange={(s) => {
              setSize(s);
              setError(null);
            }}
            error={!!error}
            note={error ?? undefined}
          />
          <div className="card-buy-row">
            <QtyStepper value={qty} onChange={setQty} small max={Math.max(1, available)} />
            <button className="btn btn-primary card-add" onClick={handleAdd} disabled={soldOut}>
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
