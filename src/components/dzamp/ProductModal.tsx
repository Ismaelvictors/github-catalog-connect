import { useEffect, useState } from "react";
import { CATEGORY_LABELS, lineFor } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import type { CartItem, Product, StoreSettings } from "@/lib/dzamp/types";
import {
  firstAvailableIfSingle,
  isSoldOut,
  QtyStepper,
  SizePills,
  WholesaleHint,
} from "./product-controls";

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
  const line = lineFor(product.category);
  const soldOut = isSoldOut(product.stock);
  const [imageIndex, setImageIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [size, setSize] = useState<string | null>(() => firstAvailableIfSingle(product.stock));
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const maxQty = size
    ? Math.max(1, product.stock.find((s) => s.size === size)?.quantity ?? 1)
    : 99;
  const savings =
    product.wholesalePrice > 0 && product.wholesalePrice < product.price
      ? product.price - product.wholesalePrice
      : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) setZoomed(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, zoomed]);

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
          <button
            type="button"
            className="pm-main pm-zoomable"
            onClick={() => setZoomed(true)}
            aria-label="Ampliar foto"
          >
            <img src={product.images[imageIndex] ?? ""} alt={product.title} />
            {soldOut && <span className="soldout-seal">Esgotado</span>}
          </button>
          {product.images.length > 1 && (
            <div className="pm-thumbs">
              {product.images.map((img, idx) => (
                <button
                  key={img}
                  className={`pm-thumb ${idx === imageIndex ? "pm-thumb-active" : ""}`}
                  onClick={() => setImageIndex(idx)}
                  aria-label={`Imagem ${idx + 1}`}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pm-info">
          <span className={`cat-tag cat-${product.category}`}>
            {CATEGORY_LABELS[product.category]}
          </span>
          <h2>{product.title}</h2>
          <p className="pm-price">{formatBRL(product.price)}</p>
          {savings > 0 && (
            <p className="pm-wholesale">
              Atacado <strong>{formatBRL(product.wholesalePrice)}</strong>
              <span className="muted"> · economize {formatBRL(savings)} por peça</span>
            </p>
          )}
          <WholesaleHint product={product} settings={settings} />
          {product.description && (
            <p className="pm-desc pm-desc-rich">{product.description}</p>
          )}

          <div className="pm-sizes">
            <label>
              Tamanho <span className="required">*</span>
            </label>
            <SizePills
              stock={product.stock}
              value={size}
              onChange={(s) => {
                setSize(s);
                setSizeError(false);
                setQty(1);
              }}
              error={sizeError}
            />
            {line.sizesNote && <p className="size-note">{line.sizesNote}</p>}
            {sizeError && <p className="field-error">Selecione um tamanho para continuar.</p>}
          </div>

          <div className="pm-qty">
            <label>Quantidade</label>
            <QtyStepper value={qty} onChange={setQty} max={maxQty} />
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={handleAdd}
            disabled={soldOut}
          >
            {soldOut ? "Produto esgotado" : "Adicionar à Sacola"}
          </button>
        </div>
      </div>

      {zoomed && (
        <div
          className="zoom-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(false);
          }}
        >
          <img src={product.images[imageIndex] ?? ""} alt={product.title} />
        </div>
      )}
    </div>
  );
}
