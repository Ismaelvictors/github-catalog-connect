import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { catalogQueryOptions, placeOrder } from "@/lib/catalog.functions";
import { buildWhatsappLink, formatBRL } from "@/lib/dzamp/format";
import { computeCart, GROUP_LABEL, type WholesaleGroup } from "@/lib/dzamp/pricing";
import { DEFAULT_SETTINGS } from "@/lib/dzamp/settings";
import { useCart } from "./cart";

export function CartDrawer() {
  const { items, open, setOpen, updateQty, remove, clear } = useCart();
  const { data } = useQuery(catalogQueryOptions);
  const settings = data?.settings ?? DEFAULT_SETTINGS;
  const pricing = useMemo(() => computeCart(items, settings), [items, settings]);
  const placeOrderFn = useServerFn(placeOrder);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stockOf = (productId: string, size: string) =>
    data?.products.find((p) => p.id === productId)?.stock.find((s) => s.size === size)?.quantity;

  const handleCheckout = async () => {
    if (!pricing.minOrderReached || busy) return;
    setBusy(true);
    setError(null);
    // Open window synchronously to avoid popup blockers
    const win = window.open("", "_blank");
    try {
      const res = await placeOrderFn({
        data: { items: items.map((i) => ({ product_id: i.productId, size: i.size, qty: i.qty })) },
      });
      if (!res.ok) {
        win?.close();
        if (res.reason === "stock") {
          const names = res.problems
            .map((p) => {
              const it = items.find((i) => i.productId === p.product_id && i.size === p.size);
              return it ? `${it.title} (${p.size}): ${p.available} disponível` : null;
            })
            .filter(Boolean)
            .join("; ");
          setError(`Alguns itens não têm estoque suficiente — ${names}. Ajuste a sacola e tente novamente.`);
        } else {
          setError(`O pedido mínimo é ${formatBRL(res.minimum)}.`);
        }
        await queryClient.invalidateQueries({ queryKey: ["catalog"] });
        return;
      }
      const url = buildWhatsappLink(settings.whatsappNumber, {
        code: res.code,
        items: items.map((i) => ({ qty: i.qty, title: i.title, size: i.size, unit: pricing.unitPrice(i) })),
        subtotal: Number(res.subtotal),
        discount: Number(res.discount),
        total: Number(res.total),
      });
      if (win) win.location.href = url;
      else window.location.href = url;
      clear();
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
    } catch (e) {
      win?.close();
      setError(e instanceof Error ? e.message : "Erro ao finalizar o pedido.");
    } finally {
      setBusy(false);
    }
  };

  // Hybrid progress: minimum value first, then wholesale target
  const progress = (() => {
    if (!items.length) return null;
    if (settings.minOrderEnabled && !pricing.minOrderReached) {
      const pct = Math.min(100, (pricing.total / settings.minOrderValue) * 100);
      return {
        pct,
        label: `${formatBRL(pricing.total)} / ${formatBRL(settings.minOrderValue)}`,
        text: `Faltam ${formatBRL(pricing.missingForMin)} para liberar o envio do pedido.`,
        tone: "warn" as const,
      };
    }
    if (!settings.wholesaleEnabled) return null;
    const groups = (["traditional", "uv"] as WholesaleGroup[]).filter((g) => pricing.groups[g].hasItems);
    const pending = groups.find((g) => !pricing.groups[g].active);
    if (pending) {
      const g = pricing.groups[pending];
      const missing = g.min - g.qty;
      return {
        pct: Math.min(100, (g.qty / g.min) * 100),
        label: `${g.qty} / ${g.min} peças ${pending === "uv" ? "UV" : `(${GROUP_LABEL[pending]})`}`,
        text: `${settings.minOrderEnabled ? "Pedido liberado! " : ""}Faltam só ${missing} ${
          missing === 1 ? "peça" : "peças"
        } para você economizar ainda mais com preço de atacado.`,
        tone: "info" as const,
      };
    }
    return { pct: 100, label: "", text: "🎉 Preço de atacado aplicado em todas as peças!", tone: "ok" as const };
  })();

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

        {settings.minOrderEnabled && (
          <p className="cart-min-tag">Pedido mínimo: {formatBRL(settings.minOrderValue)}</p>
        )}

        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Sua sacola está vazia.</p>
            <p className="muted">Explore o catálogo e adicione seus produtos favoritos.</p>
          </div>
        ) : (
          <>
            {progress && (
              <div className={`cart-progress cart-progress-${progress.tone}`}>
                {progress.tone !== "ok" && (
                  <div className="cart-progress-bar" aria-hidden="true">
                    <span style={{ width: `${progress.pct}%` }} />
                  </div>
                )}
                {progress.label && <span className="cart-progress-label">{progress.label}</span>}
                <p>{progress.text}</p>
              </div>
            )}
            <div className="cart-items">
              {items.map((item) => {
                const unit = pricing.unitPrice(item);
                const stock = stockOf(item.productId, item.size);
                const over = stock !== undefined && item.qty > stock;
                return (
                  <div className="cart-item" key={item.key}>
                    <img src={item.image} alt={item.title} className="cart-thumb" />
                    <div className="cart-item-info">
                      <strong>{item.title}</strong>
                      <span className="muted">
                        Tamanho: {item.size} ·{" "}
                        {unit < item.price ? (
                          <>
                            <s>{formatBRL(item.price)}</s> <b className="price-wholesale">{formatBRL(unit)}</b>
                          </>
                        ) : (
                          formatBRL(unit)
                        )}{" "}
                        un.
                      </span>
                      {over && (
                        <span className="cart-stock-warn">
                          {stock === 0 ? "Esgotado" : `Apenas ${stock} em estoque`}
                        </span>
                      )}
                      <div className="qty-row">
                        <button className="qty-btn" onClick={() => updateQty(item.key, -1)} aria-label="Diminuir">
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => updateQty(item.key, 1)}
                          aria-label="Aumentar"
                          disabled={stock !== undefined && item.qty >= stock}
                        >
                          +
                        </button>
                        <button className="link-danger" onClick={() => remove(item.key)}>
                          Remover
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-price">{formatBRL(item.qty * unit)}</div>
                  </div>
                );
              })}
            </div>
            <div className="cart-foot">
              {pricing.discount > 0 && (
                <>
                  <div className="subtotal subtotal-sm">
                    <span>Subtotal</span>
                    <span>{formatBRL(pricing.subtotal)}</span>
                  </div>
                  <div className="subtotal subtotal-sm price-wholesale">
                    <span>Desconto atacado</span>
                    <span>-{formatBRL(pricing.discount)}</span>
                  </div>
                </>
              )}
              <div className="subtotal">
                <span>Total</span>
                <strong>{formatBRL(pricing.total)}</strong>
              </div>
              {error && <p className="field-error">{error}</p>}
              <button
                className="btn-whatsapp"
                onClick={handleCheckout}
                disabled={!pricing.minOrderReached || busy}
              >
                {busy ? "Registrando pedido..." : "Finalizar Pedido via WhatsApp"}
              </button>
              <p className="muted cart-hint">Você será direcionado ao WhatsApp para confirmar seu pedido.</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
