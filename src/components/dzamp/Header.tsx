import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useCart } from "./cart";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/catalogo", label: "Catálogo" },
  { to: "/contatos", label: "Contatos" },
] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, setOpen } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="header">
      <div className="header-card">
        <div className="header-left">
          <Link to="/" className="header-logo" aria-label="DZAMP — página inicial">
            <img src="/images/logo.png" alt="DZAMP" />
          </Link>
          <nav className="header-nav">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className={pathname === l.to ? "active" : ""}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="header-actions">
          <button className="sacola-btn" onClick={() => setOpen(true)} aria-label="Abrir sacola">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 7h12l-1.2 12.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z" />
              <path d="M9 7V5a3 3 0 0 1 6 0v2" />
            </svg>
            {count > 0 && <span className="sacola-badge">{count}</span>}
          </button>
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className={`overlay ${menuOpen ? "show" : ""}`} onClick={() => setMenuOpen(false)} />
      <aside className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <div className="cart-head">
          <h2>Menu</h2>
          <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
            ✕
          </button>
        </div>
        <nav className="mobile-menu-nav">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={pathname === l.to ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
    </header>
  );
}
