import { useEffect, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import type { CartItem, Product, StoreSettings } from "@/lib/dzamp/types";
import { firstAvailableIfSingle, isSoldOut, QtyStepper, SizePills, WholesaleHint } from "./product-controls";
import { toCartItem } from "./ProductCard";

export function ProductModal({
  product,
  settings,
  onClose,
  onAdd,
}: {
  product: Product;
  settings: StoreSettings;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "key">) => void;
}) {
  const soldOut = isSoldOut(product.stock);
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState<string | null>(firstAvailableIfSingle(product.stock));
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const available = product.stock.find((s) => s.size === size)?.quantity ?? 99;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleAdd = () => {
    if (!size) return setError("Selecione um tamanho para continuar.");
    if (qty > available) return setError(`Apenas ${available} em estoque neste tamanho.`);
    onAdd(toCartItem(product, size, qty));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal product-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
      >
        <button className="icon-btn modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
        <div className="pm-gallery">
          <div className="pm-main">
            <img src={product.images[imageIndex] ?? ""} alt={product.title} />
            {soldOut && <span className="soldout-badge">Esgotado</span>}
            {product.images.length > 1 && (
              <>
                <button
                  className="pm-arrow pm-prev"
                  onClick={() => setImageIndex((imageIndex - 1 + product.images.length) % product.images.length)}
                  aria-label="Imagem anterior"
                >
                  ‹
                </button>
                <button
                  className="pm-arrow pm-next"
                  onClick={() => setImageIndex((imageIndex + 1) % product.images.length)}
                  aria-label="Próxima imagem"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>

        <div className="pm-info">
          <span className={`cat-tag cat-${product.category}`}>{CATEGORY_LABELS[product.category]}</span>
          <h2>{product.title}</h2>
          <p className="pm-price">{formatBRL(product.price)}</p>
          <WholesaleHint product={product} settings={settings} />
          {product.description && <p className="pm-desc">{product.description}</p>}

          <div className="pm-sizes">
            <label>
              Tamanho <span className="required">*</span>
            </label>
            <SizePills
              stock={product.stock}
              value={size}
              onChange={(s) => {
                setSize(s);
                setError(null);
              }}
              error={!!error}
            />
            {error && <p className="field-error">{error}</p>}
          </div>

          <div className="pm-qty">
            <label>Quantidade</label>
            <QtyStepper value={qty} onChange={setQty} max={Math.max(1, available)} />
          </div>

          <button className="btn btn-primary btn-block" onClick={handleAdd} disabled={soldOut}>
            {soldOut ? "Produto esgotado" : "Adicionar à Sacola"}
          </button>
        </div>
      </div>
    </div>
  );
}
