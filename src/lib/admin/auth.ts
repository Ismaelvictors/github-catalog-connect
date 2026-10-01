import { supabase } from "@/integrations/supabase/client";

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function isAdminUser(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  const { data: claimed } = await supabase.rpc("claim_owner_admin");
  if (claimed) return true;
  const { data } = await supabase.rpc("has_role", {
    _user_id: session.user.id,
    _role: "admin",
  });
  return Boolean(data);
}

export async function loginAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: isAdmin, error: claimError } = await supabase.rpc("claim_owner_admin");
  if (claimError) throw claimError;
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error("Esta conta não tem permissão de administrador.");
  }
  return data.session;
}

export async function logoutAdmin() {
  await supabase.auth.signOut();
}

export async function requireAdminSession() {
  const session = await getSession();
  if (!session) return false;
  return isAdminUser();
}
