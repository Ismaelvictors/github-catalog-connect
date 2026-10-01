import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogQueryOptions, placeOrder } from "@/lib/catalog.functions";
import { buildWhatsappLink, formatBRL } from "@/lib/dzamp/format";
import { computeCart, GROUP_LABEL } from "@/lib/dzamp/pricing";
import { DEFAULT_SETTINGS } from "@/lib/dzamp/settings";
import { useCart } from "./cart";

export function CartDrawer() {
  const { items, open, setOpen, updateQty, remove, clear } = useCart();
  const { data } = useQuery(catalogQueryOptions);
  const queryClient = useQueryClient();
  const settings = data?.settings ?? DEFAULT_SETTINGS;
  const pricing = useMemo(() => computeCart(items, settings), [items, settings]);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const trad = pricing.groups.traditional;
  const uv = pricing.groups.uv;
  const wholesaleReady =
    settings.wholesaleEnabled &&
    ((trad.hasItems && trad.active) || (uv.hasItems && uv.active)) &&
    (!trad.hasItems || trad.active) &&
    (!uv.hasItems || uv.active);
  const canCheckout = pricing.minOrderReached && items.length > 0;

  const progress = (() => {
    if (!pricing.minOrderReached && settings.minOrderEnabled) {
      const pct = Math.min(100, (pricing.total / settings.minOrderValue) * 100);
      return {
        pct,
        label: `${formatBRL(pricing.total)} / ${formatBRL(settings.minOrderValue)}`,
        hint: `Faltam ${formatBRL(pricing.missingForMin)} para liberar o envio do pedido.`,
      };
    }
    if (settings.wholesaleEnabled && !wholesaleReady) {
      const focus = trad.hasItems && !trad.active ? trad : uv.hasItems && !uv.active ? uv : trad;
      const groupKey = focus === uv ? "uv" : "traditional";
      const missing = Math.max(0, focus.min - focus.qty);
      const pct = focus.min > 0 ? Math.min(100, (focus.qty / focus.min) * 100) : 100;
      return {
        pct,
        label: `${focus.qty} / ${focus.min} peças ${groupKey === "uv" ? "UV" : "tradicionais"}`,
        hint: `Pedido liberado! Faltam só ${missing} peças para você economizar ainda mais com preço de atacado.`,
      };
    }
    return null;
  })();

  const handleCheckout = async () => {
    if (!canCheckout || submitting) return;
    setAlert(null);
    setSubmitting(true);
    try {
      const result = await placeOrder({
        data: {
          items: items.map((i) => ({
            product_id: i.productId,
            size: i.size,
            qty: i.qty,
          })),
        },
      });

      if (!result.ok) {
        if (result.reason === "stock") {
          const names = result.problems
            .map((p) => {
              const item = items.find((i) => i.productId === p.product_id && i.size === p.size);
              return `${item?.title ?? "Item"} (${p.size}): só ${p.available} un.`;
            })
            .join(" · ");
          setAlert(`Estoque insuficiente: ${names}`);
          await queryClient.invalidateQueries({ queryKey: ["catalog"] });
          return;
        }
        setAlert(`Pedido mínimo de ${formatBRL(result.minimum)} ainda não atingido.`);
        return;
      }

      const link = buildWhatsappLink(settings.whatsappNumber, {
        code: result.code,
        items: items.map((i) => ({
          qty: i.qty,
          title: i.title,
          size: i.size,
          unit: pricing.unitPrice(i),
        })),
        subtotal: result.subtotal,
        discount: result.discount,
        total: result.total,
      });
      clear();
      setOpen(false);
      window.open(link, "_blank", "noopener,noreferrer");
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    } catch (err) {
      setAlert(err instanceof Error ? err.message : "Não foi possível finalizar o pedido.");
    } finally {
      setSubmitting(false);
    }
  };

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
              {items.map((item) => {
                const unit = pricing.unitPrice(item);
                const discounted = unit < item.price;
                return (
                  <div className="cart-item" key={item.key}>
                    <img src={item.image} alt={item.title} className="cart-thumb" />
                    <div className="cart-item-info">
                      <strong>{item.title}</strong>
                      <span className="muted">Tamanho: {item.size}</span>
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
                    <div className="cart-item-price">
                      {discounted && (
                        <span className="price-strike">{formatBRL(item.qty * item.price)}</span>
                      )}
                      <span>{formatBRL(item.qty * unit)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-foot">
              {progress && (
                <div className="cart-progress">
                  <div className="cart-progress-track">
                    <div className="cart-progress-fill" style={{ width: `${progress.pct}%` }} />
                  </div>
                  <p className="cart-progress-label">{progress.label}</p>
                  <p className="muted">{progress.hint}</p>
                </div>
              )}

              {wholesaleReady && pricing.discount > 0 && (
                <div className="cart-wholesale-win">
                  <p className="cart-win-seal">Preço de atacado aplicado nas peças elegíveis!</p>
                  {(trad.hasItems || uv.hasItems) && (
                    <p className="muted">
                      {[trad.hasItems && trad.active && GROUP_LABEL.traditional, uv.hasItems && uv.active && GROUP_LABEL.uv]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              )}

              <div className="subtotal">
                <span>Subtotal</span>
                <strong className={pricing.discount > 0 ? "price-strike" : ""}>
                  {formatBRL(pricing.subtotal)}
                </strong>
              </div>
              {pricing.discount > 0 && (
                <>
                  <div className="subtotal discount-row">
                    <span>Desconto atacado</span>
                    <strong>-{formatBRL(pricing.discount)}</strong>
                  </div>
                  <div className="subtotal">
                    <span>Total</span>
                    <strong>{formatBRL(pricing.total)}</strong>
                  </div>
                </>
              )}

              {alert && <p className="cart-alert">{alert}</p>}

              <button
                type="button"
                className={`btn-whatsapp ${canCheckout ? "" : "is-disabled"}`}
                disabled={!canCheckout || submitting}
                onClick={handleCheckout}
              >
                {submitting
                  ? "Validando estoque..."
                  : canCheckout
                    ? "Finalizar Pedido via WhatsApp"
                    : "Atinga o pedido mínimo"}
              </button>
              <p className="muted cart-hint">
                {canCheckout
                  ? "O estoque será reservado e você confirmará o pedido no WhatsApp."
                  : settings.minOrderEnabled
                    ? `Pedido mínimo: ${formatBRL(settings.minOrderValue)}.`
                    : "Adicione itens para continuar."}
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
