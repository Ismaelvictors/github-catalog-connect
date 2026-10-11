export function formatCurrencyInput(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return `R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function currencyInputToNumber(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

export function formatCurrencyValue(value: number): string {
  if (!Number.isFinite(value)) return "";
  const cents = Math.round(value * 100);
  return `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
