import { useEffect, useState } from "react";
import { supabase } from "@/lib/external-db-client";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/dzamp/settings";

type Contacts = Pick<typeof DEFAULT_SETTINGS, "whatsappNumber" | "instagramHandle" | "contactEmail">;

function formatWhatsapp(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  const split = number.length === 9 ? 5 : 4;
  const formattedNumber = number.length > split ? `${number.slice(0, split)}-${number.slice(split)}` : number;
  return `+55${ddd ? ` (${ddd}${ddd.length === 2 ? ")" : ""}` : ""}${number ? ` ${formattedNumber}` : ""}`;
}

export function ContactsPanel({ onSaved }: { onSaved: () => void }) {
  const [contacts, setContacts] = useState<Contacts>({
    whatsappNumber: DEFAULT_SETTINGS.whatsappNumber,
    instagramHandle: DEFAULT_SETTINGS.instagramHandle,
    contactEmail: DEFAULT_SETTINGS.contactEmail,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.from("settings").select("key,value").in("key", [
      SETTING_KEYS.whatsappNumber,
      SETTING_KEYS.instagramHandle,
      SETTING_KEYS.contactEmail,
    ]).then(({ data }) => {
      const values = new Map((data ?? []).map((row) => [row.key, row.value]));
      setContacts({
        whatsappNumber: values.get(SETTING_KEYS.whatsappNumber) || DEFAULT_SETTINGS.whatsappNumber,
        instagramHandle: values.get(SETTING_KEYS.instagramHandle) || DEFAULT_SETTINGS.instagramHandle,
        contactEmail: values.get(SETTING_KEYS.contactEmail) || DEFAULT_SETTINGS.contactEmail,
      });
      setLoaded(true);
    });
  }, []);

  const update = (key: keyof Contacts, value: string) => setContacts((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setMessage(null);
    const nationalPhone = contacts.whatsappNumber.replace(/\D/g, "").replace(/^55/, "");
    const email = contacts.contactEmail.trim();
    const handle = contacts.instagramHandle.trim().replace(/^@/, "");
    if (nationalPhone.length < 10) return setMessage({ error: true, text: "Informe o WhatsApp com DDD e número." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMessage({ error: true, text: "Informe um e-mail válido." });
    if (!handle || /\s/.test(handle)) return setMessage({ error: true, text: "Informe um usuário válido do Instagram." });

    setBusy(true);
    const values: [string, string][] = [
      [SETTING_KEYS.whatsappNumber, `55${nationalPhone}`],
      [SETTING_KEYS.instagramHandle, handle],
      [SETTING_KEYS.contactEmail, email],
    ];
    const { error } = await supabase.from("settings").upsert(
      values.map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() })),
      { onConflict: "key" },
    );
    setBusy(false);
    if (error) return setMessage({ error: true, text: "Não foi possível salvar os contatos." });
    setContacts({ whatsappNumber: `55${nationalPhone}`, instagramHandle: handle, contactEmail: email });
    setMessage({ error: false, text: "Contatos salvos." });
    onSaved();
  };

  if (!loaded) return <p className="muted">Carregando contatos...</p>;

  return (
    <section className="admin-settings">
      <div className="admin-card">
        <h3>Contatos da loja</h3>
        <p className="muted">Essas informações aparecem como ícones na página de contatos.</p>
        <label>
          WhatsApp com DDI e DDD
          <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+55 (11) 99999-9999" value={formatWhatsapp(contacts.whatsappNumber)} onChange={(event) => update("whatsappNumber", event.target.value)} />
        </label>
        <label>
          Usuário do Instagram
          <input type="text" autoComplete="off" placeholder="@dzamp" value={contacts.instagramHandle.startsWith("@") ? contacts.instagramHandle : `@${contacts.instagramHandle}`} onChange={(event) => update("instagramHandle", event.target.value)} />
        </label>
        <label>
          E-mail de contato
          <input type="email" autoComplete="email" placeholder="contato@dzamp.com.br" value={contacts.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} />
        </label>
      </div>
      {message && <p className={message.error ? "field-error" : "admin-ok"} role="status">{message.text}</p>}
      <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>
        {busy ? "Salvando..." : "Salvar contatos"}
      </button>
    </section>
  );
}
