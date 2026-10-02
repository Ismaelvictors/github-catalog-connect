import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso do lojista — DZAMP" },
      { name: "description", content: "Área restrita para gestão de produtos e estoque DZAMP." },
      { property: "og:title", content: "Acesso do lojista — DZAMP" },
      { property: "og:description", content: "Área restrita para gestão de produtos e estoque DZAMP." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("E-mail ou senha inválidos, ou e-mail ainda não confirmado.");
        const { data: isAdmin } = await supabase.rpc("claim_owner_admin");
        if (!isAdmin) {
          await supabase.auth.signOut();
          throw new Error("Esta conta não tem acesso ao painel.");
        }
        navigate({ to: "/admin", replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw new Error(error.message);
        setMsg({ type: "ok", text: "Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre." });
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw new Error(error.message);
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
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
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
