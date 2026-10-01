import type { StoreSettings } from "./types";

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: "5500999999999",
  minOrderEnabled: true,
  minOrderValue: 200,
  wholesaleEnabled: true,
  wholesaleMinTraditional: 20,
  wholesaleMinUv: 30,
};

export const SETTING_KEYS = {
  whatsappNumber: "whatsapp_number",
  minOrderEnabled: "min_order_enabled",
  minOrderValue: "min_order_value",
  wholesaleEnabled: "wholesale_enabled",
  wholesaleMinTraditional: "wholesale_min_traditional",
  wholesaleMinUv: "wholesale_min_uv",
} as const satisfies Record<keyof StoreSettings, string>;

export function parseSettings(rows: { key: string; value: string }[]): StoreSettings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const num = (k: string, d: number) => {
    const v = Number(map.get(k));
    return Number.isFinite(v) && map.has(k) ? v : d;
  };
  const bool = (k: string, d: boolean) => (map.has(k) ? map.get(k) === "true" : d);
  const d = DEFAULT_SETTINGS;
  return {
    whatsappNumber: map.get(SETTING_KEYS.whatsappNumber) || d.whatsappNumber,
    minOrderEnabled: bool(SETTING_KEYS.minOrderEnabled, d.minOrderEnabled),
    minOrderValue: num(SETTING_KEYS.minOrderValue, d.minOrderValue),
    wholesaleEnabled: bool(SETTING_KEYS.wholesaleEnabled, d.wholesaleEnabled),
    wholesaleMinTraditional: num(SETTING_KEYS.wholesaleMinTraditional, d.wholesaleMinTraditional),
    wholesaleMinUv: num(SETTING_KEYS.wholesaleMinUv, d.wholesaleMinUv),
  };
}

/** Images uploaded by the admin are stored as "storage:<path>" in the private bucket. */
export const STORAGE_PREFIX = "storage:";
export const IMAGE_BUCKET = "product-images";
