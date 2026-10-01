import { useEffect, useState, type FormEvent } from "react";
import type { StoreSettings } from "@/lib/dzamp/types";

export function SettingsPanel({
  initial,
  onSave,
}: {
  initial: StoreSettings;
  onSave: (settings: StoreSettings) => Promise<void>;
}) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(initial);
  }, [initial]);

  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await onSave(settings);
      setMessage("Configurações salvas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-settings" onSubmit={handleSubmit}>
      <h2>Regras comerciais</h2>
      <p className="muted">Altere os parâmetros da loja quando quiser. As mudanças valem na hora.</p>

      <fieldset>
        <legend>Pedido mínimo</legend>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={settings.minOrderEnabled}
            onChange={(e) => update("minOrderEnabled", e.target.checked)}
          />
          Exigir valor mínimo para liberar o pedido
        </label>
        <label>
          Valor mínimo (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={settings.minOrderValue}
            onChange={(e) => update("minOrderValue", Number(e.target.value))}
            disabled={!settings.minOrderEnabled}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Atacado</legend>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={settings.wholesaleEnabled}
            onChange={(e) => update("wholesaleEnabled", e.target.checked)}
          />
          Ativar preço de atacado
        </label>
        <label>
          Mínimo linhas tradicionais (Infantil + Jovem + Adulto)
          <input
            type="number"
            min="1"
            step="1"
            value={settings.wholesaleMinTraditional}
            onChange={(e) => update("wholesaleMinTraditional", Number(e.target.value))}
            disabled={!settings.wholesaleEnabled}
          />
        </label>
        <label>
          Mínimo linha UV
          <input
            type="number"
            min="1"
            step="1"
            value={settings.wholesaleMinUv}
            onChange={(e) => update("wholesaleMinUv", Number(e.target.value))}
            disabled={!settings.wholesaleEnabled}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>WhatsApp</legend>
        <label>
          Número oficial (com DDI, só dígitos)
          <input
            type="tel"
            value={settings.whatsappNumber}
            onChange={(e) => update("whatsappNumber", e.target.value.replace(/\D/g, ""))}
            placeholder="5500999999999"
            required
          />
        </label>
      </fieldset>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-error">{error}</p>}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}
