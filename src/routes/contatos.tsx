import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <h1>Contatos</h1>
          <p className="muted">
            Estamos por aqui para ajudar com tamanhos, estampas, prazos e entrega.
          </p>
        </div>

        <div className="contact-grid">
          <div className="contact-card">
            <h3>Atendimento</h3>
            <p className="muted">Segunda a sábado, das 9h às 18h.</p>
            <ul className="contact-list">
              <li>
                <strong>WhatsApp</strong>
                <span className="muted">Pedidos e dúvidas rápidas</span>
              </li>
              <li>
                <strong>Instagram</strong>
                <span className="muted">@dzamp</span>
              </li>
              <li>
                <strong>E-mail</strong>
                <span className="muted">contato@dzamp.com.br</span>
              </li>
            </ul>
          </div>

          <form
            className="contact-form"
            action="https://formsubmit.co/contato@dzamp.com.br"
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
