import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — DZAMP" },
      { name: "description", content: "Defina uma nova senha para o painel DZAMP." },
      { property: "og:title", content: "Redefinir senha — DZAMP" },
      { property: "og:description", content: "Defina uma nova senha para o painel DZAMP." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg("Link inválido ou expirado. Solicite um novo.");
    navigate({ to: "/admin", replace: true });
  };

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <img src="/images/logo.png" alt="DZAMP" className="admin-login-logo" />
        <h1>Nova senha</h1>
        <label>
          Nova senha
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p className="field-error">{msg}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          Salvar senha
        </button>
      </form>
    </main>
  );
}
