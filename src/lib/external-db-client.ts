import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { externalDbPublishableKey, externalDbUrl } from "./external-db-config";

// The publishable key is opaque, not a JWT; send it as apikey, not as a bearer token.
export function externalDbFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (headers.get("Authorization") === `Bearer ${externalDbPublishableKey}`) {
    headers.delete("Authorization");
  }
  headers.set("apikey", externalDbPublishableKey);
  return fetch(input, { ...init, headers });
}

export const supabase = createClient<Database>(externalDbUrl, externalDbPublishableKey, {
  global: { fetch: externalDbFetch },
  auth: { persistSession: true, autoRefreshToken: true },
});