import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQueryOptions } from "@/lib/catalog.functions";
import { buildWhatsappLink, formatBRL } from "@/lib/dzamp/format";
import { useCart } from "./cart";

export function CartDrawer() {
  const { items, open, setOpen, updateQty, remove } = useCart();
  const { data } = useQuery(catalogQueryOptions);
  const whatsappNumber = data?.whatsappNumber ?? "5500999999999";
  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items]);

  return (
    <>
      <div className={`overlay ${open ? "show" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`cart-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="cart-head">
          <h2>Sua Sacola</h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Fechar sacola">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Sua sacola está vazia.</p>
            <p className="muted">Explore o catálogo e adicione seus produtos favoritos.</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div className="cart-item" key={item.key}>
                  <img src={item.image} alt={item.title} className="cart-thumb" />
                  <div className="cart-item-info">
                    <strong>{item.title}</strong>
                    <span className="muted">
                      Tamanho: {item.size} · Cor: {item.color}
                      {item.estampa ? ` · Estampa: ${item.estampa}` : ""}
                    </span>
                    {item.note && <span className="muted cart-note">Obs: {item.note}</span>}
                    <div className="qty-row">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.key, -1)}
                        aria-label="Diminuir"
                      >
                        −
                      </button>
                      <span>{item.qty}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.key, 1)}
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                      <button className="link-danger" onClick={() => remove(item.key)}>
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-price">{formatBRL(item.qty * item.price)}</div>
                </div>
              ))}
            </div>
            <div className="cart-foot">
              <div className="subtotal">
                <span>Subtotal</span>
                <strong>{formatBRL(total)}</strong>
              </div>
              <a
                className="btn-whatsapp"
                href={buildWhatsappLink(whatsappNumber, items)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Finalizar Pedido via WhatsApp
              </a>
              <p className="muted cart-hint">
                Você será direcionado ao WhatsApp para confirmar seu pedido.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
