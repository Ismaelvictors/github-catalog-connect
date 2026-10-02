import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseSettings, SETTING_KEYS } from "@/lib/dzamp/settings";
import type { StoreSettings } from "@/lib/dzamp/types";

export function SettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [s, setS] = useState<StoreSettings | null>(null);
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
    const phone = s.whatsappNumber.replace(/\D/g, "");
    if (phone.length < 10) return setMsg({ type: "error", text: "Informe o WhatsApp com DDI e DDD (ex.: 5511999999999)." });
    setBusy(true);
    const rows = (Object.keys(SETTING_KEYS) as (keyof StoreSettings)[]).map((k) => ({
      key: SETTING_KEYS[k],
      value: k === "whatsappNumber" ? phone : String(s[k]),
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
          Exigir valor mínimo de pedido
        </label>
        <label>
          Valor mínimo (R$)
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={s.minOrderValue}
            onChange={(e) => set("minOrderValue", Number(e.target.value))}
          />
        </label>
      </div>

      <div className="admin-card">
        <h3>Preço de atacado</h3>
        <label className="admin-toggle">
          <input type="checkbox" checked={s.wholesaleEnabled} onChange={(e) => set("wholesaleEnabled", e.target.checked)} />
          Ativar preço de atacado
        </label>
        <label>
          Peças para atacado — Infantil + Jovem + Adulto (somadas)
          <input
            type="number"
            inputMode="numeric"
            min={1}
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
            value={s.wholesaleMinUv}
            onChange={(e) => set("wholesaleMinUv", Number(e.target.value))}
          />
        </label>
      </div>

      <div className="admin-card">
        <h3>WhatsApp da loja</h3>
        <label>
          Número com DDI e DDD
          <input inputMode="tel" value={s.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} />
        </label>
      </div>

      {msg && <p className={msg.type === "error" ? "field-error" : "admin-ok"}>{msg.text}</p>}
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        {busy ? "Salvando..." : "Salvar configurações"}
      </button>
    </section>
  );
}
