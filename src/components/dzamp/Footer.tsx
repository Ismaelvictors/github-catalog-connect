import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-mark" aria-label="DZAMP">
        D<span>Z</span>AMP
      </div>
      <p className="footer-tagline">
        Catálogo digital · Estilo e atitude em cada detalhe.
      </p>
      <p className="footer-copy">
        © {new Date().getFullYear()} DZAMP. Todos os direitos reservados.
      </p>
      <Link className="footer-owner-link" to="/login">
        Área administrativa
      </Link>
    </footer>
  );
}
