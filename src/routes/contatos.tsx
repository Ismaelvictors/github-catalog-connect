import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/external-db-client";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/dzamp/settings";

const contactsQueryOptions = {
  queryKey: ["store-contacts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("settings").select("key,value").in("key", [
      SETTING_KEYS.whatsappNumber,
      SETTING_KEYS.instagramHandle,
      SETTING_KEYS.contactEmail,
    ]);
    if (error) throw error;
    const values = new Map((data ?? []).map((row) => [row.key, row.value]));
    return {
      whatsappNumber: values.get(SETTING_KEYS.whatsappNumber) || DEFAULT_SETTINGS.whatsappNumber,
      instagramHandle: values.get(SETTING_KEYS.instagramHandle) || DEFAULT_SETTINGS.instagramHandle,
      contactEmail: values.get(SETTING_KEYS.contactEmail) || DEFAULT_SETTINGS.contactEmail,
    };
  },
  staleTime: 30_000,
};

export const Route = createFileRoute("/contatos")({
  head: () => ({
    meta: [
      { title: "Contatos — DZAMP" },
      {
        name: "description",
        content:
          "Fale com a DZAMP pelo WhatsApp, Instagram ou e-mail. Tire dúvidas sobre tamanhos, estampas, prazos e entrega.",
      },
      { property: "og:title", content: "Contatos — DZAMP" },
      {
        property: "og:description",
        content: "WhatsApp, Instagram e e-mail da DZAMP para pedidos e dúvidas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactsPage,
});

function ContactsPage() {
  const { data: contacts = DEFAULT_SETTINGS } = useQuery(contactsQueryOptions);
  const phoneDigits = contacts.whatsappNumber.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${phoneDigits}`;
  const instagramHandle = contacts.instagramHandle.replace(/^@/, "");
  const instagramLabel = `@${instagramHandle}`;

  return (
    <main className="page">
      <section className="section contacts-section">
        <div className="section-head">
          <h1>Contatos</h1>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <h3>Atendimento</h3>
            <div className="contact-icon-links" aria-label="Canais de contato">
              <a className="contact-method" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={`Fale com a DZAMP pelo WhatsApp: ${contacts.whatsappNumber}`}>
                <MessageCircle size={24} aria-hidden="true" />
                <span><strong>WhatsApp</strong><small>{contacts.whatsappNumber}</small></span>
              </a>
              <a className="contact-method" href={`https://www.instagram.com/${encodeURIComponent(instagramHandle)}/`} target="_blank" rel="noopener noreferrer" aria-label={`Instagram da DZAMP: ${instagramLabel}`}>
                <Instagram size={24} aria-hidden="true" />
                <span><strong>Instagram</strong><small>{instagramLabel}</small></span>
              </a>
              <a className="contact-method" href={`mailto:${contacts.contactEmail}`} aria-label={`Enviar e-mail para ${contacts.contactEmail}`}>
                <Mail size={24} aria-hidden="true" />
                <span><strong>E-mail</strong><small>{contacts.contactEmail}</small></span>
              </a>
            </div>
          </div>

          <form
            className="contact-form"
            action={`https://formsubmit.co/${encodeURIComponent(contacts.contactEmail)}`}
            method="POST"
          >
            <h3>Envie uma mensagem</h3>
            <label htmlFor="c-name">Nome</label>
            <input id="c-name" name="nome" type="text" required placeholder="Seu nome" />
            <label htmlFor="c-email">E-mail</label>
            <input id="c-email" name="email" type="email" required placeholder="seu@email.com" />
            <label htmlFor="c-msg">Mensagem</label>
            <textarea
              id="c-msg"
              name="mensagem"
              rows={5}
              required
              placeholder="Como podemos ajudar?"
            />
            <input type="hidden" name="_captcha" value="false" />
            <button className="btn btn-primary btn-block" type="submit">
              Enviar mensagem
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
