export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildWhatsappLink(
  number: string,
  items: {
    qty: number;
    title: string;
    size: string;
    color: string;
    estampa: string;
    note: string;
    price: number;
  }[],
): string {
  const total = items.reduce((s, i) => s + i.qty * i.price, 0);
  const lines = items.map((i) => {
    let line = `- ${i.qty}x ${i.title} (Tamanho: ${i.size} · Cor: ${i.color}${
      i.estampa ? ` · Estampa: ${i.estampa}` : ""
    }) - ${formatBRL(i.qty * i.price)}`;
    if (i.note) line += `\n   Obs: ${i.note}`;
    return line;
  });
  const message = [
    "Olá! Gostaria de fazer o seguinte pedido no catálogo DZAMP:",
    "",
    ...lines,
    "",
    `Total do Pedido: ${formatBRL(total)}`,
  ].join("\n");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
