import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/images/logo.png" alt="DZAMP" />
          <p className="muted">
            Moda com identidade para todas as idades. Peças premium, atendimento próximo e pedidos
            pelo WhatsApp.
          </p>
        </div>
        <div className="footer-col">
          <h4>Navegação</h4>
          <Link to="/">Home</Link>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/contatos">Contatos</Link>
        </div>
        <div className="footer-col">
          <h4>Linhas</h4>
          <span className="muted">Infantil</span>
          <span className="muted">Jovem</span>
          <span className="muted">Adulto</span>
          <span className="muted">UV Manga Longa</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span className="muted">© {new Date().getFullYear()} DZAMP. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}
