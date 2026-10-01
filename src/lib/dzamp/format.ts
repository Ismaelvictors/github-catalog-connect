export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildWhatsappLink(
  number: string,
  order: {
    code: string;
    items: { qty: number; title: string; size: string; unit: number }[];
    subtotal: number;
    discount: number;
    total: number;
  },
): string {
  const lines = order.items.map(
    (i) => `- ${i.qty}x ${i.title} (Tamanho: ${i.size}) - ${formatBRL(i.unit)} un. = ${formatBRL(i.qty * i.unit)}`,
  );
  const message = [
    `Olá! Gostaria de confirmar meu pedido #${order.code} no catálogo DZAMP:`,
    "",
    ...lines,
    "",
    ...(order.discount > 0
      ? [`Subtotal: ${formatBRL(order.subtotal)}`, `Desconto atacado: -${formatBRL(order.discount)}`]
      : []),
    `Total do Pedido: ${formatBRL(order.total)}`,
  ].join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
