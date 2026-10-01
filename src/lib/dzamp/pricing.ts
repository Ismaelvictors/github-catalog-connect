import type { CartItem, Category, StoreSettings } from "./types";

export type WholesaleGroup = "traditional" | "uv";

export function groupOf(category: Category): WholesaleGroup {
  return category === "uv" ? "uv" : "traditional";
}

export const GROUP_LABEL: Record<WholesaleGroup, string> = {
  traditional: "Infantil, Jovem e Adulto",
  uv: "UV",
};

export interface CartPricing {
  subtotal: number;
  total: number;
  discount: number;
  groups: Record<WholesaleGroup, { qty: number; min: number; active: boolean; hasItems: boolean }>;
  unitPrice: (item: CartItem) => number;
  minOrderReached: boolean;
  missingForMin: number;
}

export function computeCart(items: CartItem[], s: StoreSettings): CartPricing {
  const qty = { traditional: 0, uv: 0 };
  for (const i of items) qty[groupOf(i.category)] += i.qty;
  const mins = { traditional: s.wholesaleMinTraditional, uv: s.wholesaleMinUv };
  const active = {
    traditional: s.wholesaleEnabled && qty.traditional >= mins.traditional,
    uv: s.wholesaleEnabled && qty.uv >= mins.uv,
  };
  const unitPrice = (i: CartItem) =>
    active[groupOf(i.category)] && i.wholesalePrice > 0 && i.wholesalePrice < i.price
      ? i.wholesalePrice
      : i.price;
  const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
  const total = items.reduce((t, i) => t + unitPrice(i) * i.qty, 0);
  const minOrderReached = !s.minOrderEnabled || total >= s.minOrderValue;
  return {
    subtotal,
    total,
    discount: subtotal - total,
    groups: {
      traditional: { qty: qty.traditional, min: mins.traditional, active: active.traditional, hasItems: qty.traditional > 0 },
      uv: { qty: qty.uv, min: mins.uv, active: active.uv, hasItems: qty.uv > 0 },
    },
    unitPrice,
    minOrderReached,
    missingForMin: Math.max(0, s.minOrderValue - total),
  };
}
