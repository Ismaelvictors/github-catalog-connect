import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "victors.testes.dev@gmail.com";

function authMessage(message: string): string {
  if (/email provider disabled|email logins are disabled/i.test(message))
    return "O acesso por e-mail está indisponível no momento. Tente novamente mais tarde.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail pelo link recebido antes de entrar.";
  if (/invalid login credentials/i.test(message))
    return "E-mail ou senha incorretos. Se ainda não criou sua conta, use Primeiro acesso.";
  if (/user already registered/i.test(message))
    return "Este e-mail já tem uma conta. Entre ou use Esqueci minha senha.";
  if (/rate limit|too many requests/i.test(message))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  return message;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso do lojista — DZAMP" },
      { name: "description", content: "Área restrita para gestão de produtos e estoque DZAMP." },
      { property: "og:title", content: "Acesso do lojista — DZAMP" },
      { property: "og:description", content: "Área restrita para gestão de produtos e estoque DZAMP." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(authMessage(error.message));
        const { data: isAdmin, error: roleError } = await supabase.rpc("claim_owner_admin");
        if (roleError || !isAdmin) {
          await supabase.auth.signOut();
          throw new Error(
            roleError
              ? "Não foi possível validar seu acesso. Tente novamente."
              : "Esta conta não tem acesso ao painel.",
          );
        }
        navigate({ to: "/admin", replace: true });
      } else if (mode === "signup") {
        if (email.trim().toLowerCase() !== OWNER_EMAIL)
          throw new Error("Use o e-mail autorizado do lojista para criar o primeiro acesso.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw new Error(authMessage(error.message));
        if (data.session) {
          const { data: isAdmin, error: roleError } = await supabase.rpc("claim_owner_admin");
          if (roleError || !isAdmin) throw new Error("Não foi possível validar seu acesso. Tente entrar novamente.");
          navigate({ to: "/admin", replace: true });
          return;
        }
        setMsg({
          type: "ok",
          text: "Confira sua caixa de entrada e confirme o e-mail pelo link enviado. Depois, entre com sua senha.",
        });
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw new Error(authMessage(error.message));
        setMsg({ type: "ok", text: "Enviamos um link de redefinição para seu e-mail." });
      }
    } catch (err) {
      setMsg({ type: "error", text: err instanceof Error ? err.message : "Erro inesperado." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <img src="/images/logo.png" alt="DZAMP" className="admin-login-logo" />
        <h1>{mode === "signup" ? "Primeiro acesso" : mode === "reset" ? "Recuperar senha" : "Painel do lojista"}</h1>
        <label>
          E-mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        {mode !== "reset" && (
          <label>
            Senha
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>
        )}
        {msg && <p className={msg.type === "error" ? "field-error" : "admin-ok"}>{msg.text}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Aguarde..." : mode === "signup" ? "Criar acesso" : mode === "reset" ? "Enviar link" : "Entrar"}
        </button>
        <div className="admin-login-links">
          {mode !== "login" && (
            <button type="button" onClick={() => setMode("login")}>
              Voltar ao login
            </button>
          )}
          {mode === "login" && (
            <>
              <button type="button" onClick={() => setMode("reset")}>
                Esqueci minha senha
              </button>
              <button type="button" onClick={() => setMode("signup")}>
                Primeiro acesso
              </button>
            </>
          )}
        </div>
      </form>
    </main>
  );
}
