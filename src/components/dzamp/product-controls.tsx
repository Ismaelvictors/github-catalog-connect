import { CATEGORIES } from "@/lib/dzamp/lines";
import type { Category } from "@/lib/dzamp/types";

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

export function ColorSelect({
  value,
  colors,
  onChange,
  id,
}: {
  value: string;
  colors: { name: string; hex: string }[];
  onChange: (v: string) => void;
  id: string;
}) {
  const active = colors.find((c) => c.name === value);
  return (
    <div className="select-field">
      <label htmlFor={id}>Cor</label>
      <div className="select-wrap">
        {active && (
          <span className="select-dot" style={{ background: active.hex }} aria-hidden="true" />
        )}
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {colors.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function EstampaSelect({
  value,
  estampas,
  onChange,
  id,
}: {
  value: string;
  estampas: string[];
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div className="select-field">
      <label htmlFor={id}>Estampa</label>
      <div className="select-wrap">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {estampas.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function SizePills({
  sizes,
  value,
  onChange,
  error,
  note,
}: {
  sizes: string[];
  value: string | null;
  onChange: (s: string) => void;
  error?: boolean | undefined;
  note?: string | undefined;
}) {
  return (
    <div className={`size-block ${error ? "size-block-error" : ""}`}>
      <div className="size-pills">
        {sizes.map((s) => (
          <button
            key={s}
            className={`size-pill ${value === s ? "size-active" : ""}`}
            onClick={() => onChange(s)}
            aria-pressed={value === s}
          >
            {s}
          </button>
        ))}
      </div>
      {note && <p className="size-note">{note}</p>}
    </div>
  );
}

export function SizeSelect({
  sizes,
  value,
  onChange,
  error,
  note,
  singleLabel,
  id,
}: {
  sizes: string[];
  value: string | null;
  onChange: (s: string) => void;
  error?: boolean | undefined;
  note?: string | undefined;
  singleLabel?: string | undefined;
  id?: string;
}) {
  return (
    <div className="select-field">
      <label htmlFor={id}>Tamanho</label>
      <div className="select-wrap">
        <select
          id={id}
          value={value ?? ""}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className={["select-plain", error ? "select-invalid" : ""].filter(Boolean).join(" ") || undefined}
          aria-invalid={error || undefined}
        >
          {!value && (
            <option value="" disabled>
              Selecione
            </option>
          )}
          {sizes.map((s) => (
            <option key={s} value={s}>
              {singleLabel && sizes.length === 1 ? singleLabel : s}
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
}: {
  value: number;
  onChange: (q: number) => void;
  small?: boolean;
}) {
  return (
    <div className={`qty-stepper ${small ? "qty-stepper-sm" : ""}`}>
      <button onClick={() => onChange(Math.max(1, value - 1))} aria-label="Diminuir quantidade">
        −
      </button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(99, value + 1))} aria-label="Aumentar quantidade">
        +
      </button>
    </div>
  );
}
