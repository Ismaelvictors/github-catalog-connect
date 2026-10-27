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
  template?: string,
): string {
  const lines = order.items.map(
    (i) => `- ${i.qty}x ${i.title} (Tamanho: ${i.size}) - ${formatBRL(i.unit)} un. = ${formatBRL(i.qty * i.unit)}`,
  );
  const values: Record<string, string> = {
    code: order.code,
    items: lines.join("\n"),
    subtotal: formatBRL(order.subtotal),
    discount: formatBRL(order.discount),
    total: formatBRL(order.total),
    subtotal_line: order.discount > 0 ? `Subtotal: ${formatBRL(order.subtotal)}` : "",
    discount_line: order.discount > 0 ? `Desconto atacado: -${formatBRL(order.discount)}` : "",
  };
  const defaultTemplate = "Olá! Gostaria de confirmar meu pedido #{{code}} no catálogo DZAMP:\n\n{{items}}\n\n{{subtotal_line}}\n{{discount_line}}\nTotal do Pedido: {{total}}";
  const message = (template || defaultTemplate)
    .replace(/{{\s*(\w+)\s*}}/g, (token, key: string) => values[key] ?? token)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
