import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, SETTING_KEYS, parseSettings } from "@/lib/dzamp/settings";
import type { StoreSettings } from "@/lib/dzamp/types";

export async function loadAdminSettings(): Promise<StoreSettings> {
  const { data, error } = await supabase.from("settings").select("key,value");
  if (error) throw error;
  return parseSettings(data ?? []);
}

export async function saveAdminSettings(settings: StoreSettings): Promise<void> {
  const rows: { key: string; value: string; updated_at: string }[] = [
    { key: SETTING_KEYS.whatsappNumber, value: settings.whatsappNumber, updated_at: new Date().toISOString() },
    {
      key: SETTING_KEYS.minOrderEnabled,
      value: String(settings.minOrderEnabled),
      updated_at: new Date().toISOString(),
    },
    {
      key: SETTING_KEYS.minOrderValue,
      value: String(settings.minOrderValue),
      updated_at: new Date().toISOString(),
    },
    {
      key: SETTING_KEYS.wholesaleEnabled,
      value: String(settings.wholesaleEnabled),
      updated_at: new Date().toISOString(),
    },
    {
      key: SETTING_KEYS.wholesaleMinTraditional,
      value: String(settings.wholesaleMinTraditional),
      updated_at: new Date().toISOString(),
    },
    {
      key: SETTING_KEYS.wholesaleMinUv,
      value: String(settings.wholesaleMinUv),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const row of rows) {
    const { error } = await supabase.from("settings").upsert(row, { onConflict: "key" });
    if (error) throw error;
  }
}

export { DEFAULT_SETTINGS };
