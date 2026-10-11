import { useEffect, useState } from "react";
import { supabase } from "@/lib/external-db-client";
import { parseSettings, SETTING_KEYS } from "@/lib/dzamp/settings";
import type { StoreSettings } from "@/lib/dzamp/types";
import { currencyInputToNumber, formatCurrencyInput, formatCurrencyValue } from "@/lib/dzamp/input-masks";

export function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [minOrderInput, setMinOrderInput] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase.from("settings").select("key,value").then(({ data }) => setS(parseSettings(data ?? [])));
  }, []);

  if (!s) return <p className="muted">Carregando...</p>;

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setS({ ...s, [k]: v });

  const save = async () => {
    setMsg(null);
    if (!(s.minOrderValue >= 0) || !(s.wholesaleMinTraditional >= 1) || !(s.wholesaleMinUv >= 1))
      return setMsg({ type: "error", text: "Verifique os valores informados." });
    setBusy(true);
    const configKeys: (keyof StoreSettings)[] = ["minOrderEnabled", "minOrderValue", "wholesaleEnabled", "wholesaleMinTraditional", "wholesaleMinUv"];
    const rows = configKeys.map((k) => ({
      key: SETTING_KEYS[k],
      value: String(s[k]),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    setBusy(false);
    if (error) return setMsg({ type: "error", text: "Não foi possível salvar." });
    setMsg({ type: "ok", text: "Configurações salvas!" });
    onSaved();
  };

  return (
    <section className="admin-settings">
      <div className="admin-card">
        <h3>Pedido mínimo</h3>
        <label className="admin-toggle">
          <input type="checkbox" checked={s.minOrderEnabled} onChange={(e) => set("minOrderEnabled", e.target.checked)} />
          <span>Exigir valor mínimo de pedido</span>
        </label>
        <label>
          Valor mínimo (R$)
          <input
            type="text"
            inputMode="decimal"
            value={minOrderInput ?? formatCurrencyValue(s.minOrderValue)}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setMinOrderInput(formatted);
              set("minOrderValue", currencyInputToNumber(formatted));
            }}
          />
        </label>
      </div>

      <div className="admin-card">
        <h3>Preço de atacado</h3>
        <label className="admin-toggle">
          <input type="checkbox" checked={s.wholesaleEnabled} onChange={(e) => set("wholesaleEnabled", e.target.checked)} />
          <span>Ativar preço de atacado</span>
        </label>
        <label>
          Peças para atacado — Infantil + Jovem + Adulto (somadas)
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            onKeyDown={(e) => { if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
            value={s.wholesaleMinTraditional}
            onChange={(e) => set("wholesaleMinTraditional", Number(e.target.value))}
          />
        </label>
        <label>
          Peças para atacado — Linha UV
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            onKeyDown={(e) => { if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault(); }}
            value={s.wholesaleMinUv}
            onChange={(e) => set("wholesaleMinUv", Number(e.target.value))}
          />
        </label>
      </div>

      {msg && <p className={msg.type === "error" ? "field-error" : "admin-ok"}>{msg.text}</p>}
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        {busy ? "Salvando..." : "Salvar configurações"}
      </button>
    </section>
  );
}
