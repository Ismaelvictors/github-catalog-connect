import { useEffect, useState } from "react";
import { CATEGORY_LABELS, lineFor, sizesFor } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import type { CartItem, Product } from "@/lib/dzamp/types";
import { ColorSelect, EstampaSelect, QtyStepper, SizePills } from "./product-controls";

export function ProductModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "key">) => void;
}) {
  const line = lineFor(product.category);
  const [imageIndex, setImageIndex] = useState(0);
  const [color, setColor] = useState(line.colors[0]?.name ?? "");
  const [estampa, setEstampa] = useState(line.estampas[0] ?? "");
  const [size, setSize] = useState<string | null>(line.sizes.length === 1 ? (line.sizes[0] ?? null) : null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [sizeError, setSizeError] = useState(false);
  const sizes = sizesFor(product.category);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
      note: note.trim(),
      qty,
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
          <div className="pm-main">
            <img src={product.images[imageIndex] ?? ""} alt={product.title} />
            {product.images.length > 1 && (
              <>
                <button
                  className="pm-arrow pm-prev"
                  onClick={() =>
                    setImageIndex((imageIndex - 1 + product.images.length) % product.images.length)
                  }
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
          {product.description && <p className="pm-desc">{product.description}</p>}

          <div className="pm-options">
            <ColorSelect id="pm-color" value={color} colors={line.colors} onChange={setColor} />
            {line.hasEstampa && (
              <EstampaSelect
                id="pm-estampa"
                value={estampa}
                estampas={line.estampas}
                onChange={setEstampa}
              />
            )}
          </div>

          <div className="pm-sizes">
            <label>
              Tamanho <span className="required">*</span>
            </label>
            <SizePills
              sizes={sizes}
              value={size}
              onChange={(s) => {
                setSize(s);
                setSizeError(false);
              }}
              error={sizeError}
              note={line.sizesNote}
            />
            {sizeError && <p className="field-error">Selecione um tamanho para continuar.</p>}
          </div>

          <div className="pm-qty">
            <label>Quantidade</label>
            <QtyStepper value={qty} onChange={setQty} />
          </div>

          <div className="pm-note">
            <label htmlFor="pm-note-input">Observação (opcional)</label>
            <textarea
              id="pm-note-input"
              rows={2}
              placeholder="Ex.: preferência de cor, detalhes de entrega..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={handleAdd}>
            Adicionar à Sacola
          </button>
        </div>
      </div>
    </div>
  );
}
