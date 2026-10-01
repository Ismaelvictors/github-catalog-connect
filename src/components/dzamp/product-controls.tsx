import { CATEGORIES } from "@/lib/dzamp/lines";
import { formatBRL } from "@/lib/dzamp/format";
import { groupOf } from "@/lib/dzamp/pricing";
import type { Category, Product, StockEntry, StoreSettings } from "@/lib/dzamp/types";

export function CategoryChips({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (c: Category | "all") => void;
}) {
  return (
    <div className="chips">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          className={`chip ${active === c.id ? "chip-active" : ""}`}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function isSoldOut(stock: StockEntry[]): boolean {
  return stock.length === 0 || stock.every((s) => s.quantity <= 0);
}

export function firstAvailableIfSingle(stock: StockEntry[]): string | null {
  const avail = stock.filter((s) => s.quantity > 0);
  return stock.length === 1 && avail.length === 1 ? (avail[0]?.size ?? null) : null;
}

export function WholesaleHint({ product, settings }: { product: Product; settings: StoreSettings }) {
  if (!settings.wholesaleEnabled || !(product.wholesalePrice > 0 && product.wholesalePrice < product.price))
    return null;
  const g = groupOf(product.category);
  const min = g === "uv" ? settings.wholesaleMinUv : settings.wholesaleMinTraditional;
  return (
    <p className="wholesale-hint">
      Atacado <strong>{formatBRL(product.wholesalePrice)}</strong>{" "}
      {g === "uv" ? `a partir de ${min} peças UV` : `a partir de ${min} peças combinadas`}
    </p>
  );
}

export function SizePills({
  stock,
  value,
  onChange,
  error,
}: {
  stock: StockEntry[];
  value: string | null;
  onChange: (s: string) => void;
  error?: boolean | undefined;
}) {
  return (
    <div className={`size-block ${error ? "size-block-error" : ""}`}>
      <div className="size-pills">
        {stock.map((s) => {
          const out = s.quantity <= 0;
          return (
            <button
              key={s.size}
              className={`size-pill ${value === s.size ? "size-active" : ""} ${out ? "size-out" : ""}`}
              onClick={() => !out && onChange(s.size)}
              disabled={out}
              aria-pressed={value === s.size}
              title={out ? "Esgotado" : undefined}
            >
              {s.size}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SizeSelect({
  stock,
  value,
  onChange,
  error,
  note,
  id,
  disabled,
}: {
  stock: StockEntry[];
  value: string | null;
  onChange: (s: string) => void;
  error?: boolean | undefined;
  note?: string | undefined;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div className="select-field">
      <label htmlFor={id}>Tamanho</label>
      <div className="select-wrap">
        <select
          id={id}
          value={value ?? ""}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className={["select-plain", error ? "select-invalid" : ""].filter(Boolean).join(" ")}
          aria-invalid={error || undefined}
        >
          {!value && (
            <option value="" disabled>
              {disabled ? "Esgotado" : "Selecione"}
            </option>
          )}
          {stock.map((s) => (
            <option key={s.size} value={s.size} disabled={s.quantity <= 0}>
              {s.size}
              {s.quantity <= 0 ? " (Esgotado)" : ""}
            </option>
          ))}
        </select>
      </div>
      {note && <p className="size-note">{note}</p>}
    </div>
  );
}

export function QtyStepper({
  value,
  onChange,
  small,
  max = 99,
}: {
  value: number;
  onChange: (q: number) => void;
  small?: boolean;
  max?: number;
}) {
  return (
    <div className={`qty-stepper ${small ? "qty-stepper-sm" : ""}`}>
      <button onClick={() => onChange(Math.max(1, value - 1))} aria-label="Diminuir quantidade">
        −
      </button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} aria-label="Aumentar quantidade">
        +
      </button>
    </div>
  );
}
