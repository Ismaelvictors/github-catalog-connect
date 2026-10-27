import type { StoreSettings } from "./types";

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: "5585981762787",
  instagramHandle: "@dzamp",
  contactEmail: "contato@dzamp.com.br",
  minOrderEnabled: true,
  minOrderValue: 200,
  wholesaleEnabled: true,
  wholesaleMinTraditional: 20,
  wholesaleMinUv: 30,
  whatsappOrderTemplate: "Olá! Gostaria de confirmar meu pedido #{{code}} no catálogo DZAMP:\n\n{{items}}\n\n{{subtotal_line}}\n{{discount_line}}\nTotal do Pedido: {{total}}",
};

export const SETTING_KEYS = {
  whatsappNumber: "whatsapp_number",
  instagramHandle: "instagram_handle",
  contactEmail: "contact_email",
  minOrderEnabled: "min_order_enabled",
  minOrderValue: "min_order_value",
  wholesaleEnabled: "wholesale_enabled",
  wholesaleMinTraditional: "wholesale_min_traditional",
  wholesaleMinUv: "wholesale_min_uv",
  whatsappOrderTemplate: "whatsapp_order_template",
} as const satisfies Record<keyof StoreSettings, string>;

export const CAROUSEL_SETTING_KEY = "homepage_carousel_images";
export const DEFAULT_CAROUSEL_IMAGES = [
  "/images/carousel/carousel-1.jpg",
  "/images/carousel/carousel-2.jpg",
  "/images/carousel/carousel-3.jpg",
  "/images/carousel/carousel-4.jpg",
];

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
    instagramHandle: map.get(SETTING_KEYS.instagramHandle) || d.instagramHandle,
    contactEmail: map.get(SETTING_KEYS.contactEmail) || d.contactEmail,
    minOrderEnabled: bool(SETTING_KEYS.minOrderEnabled, d.minOrderEnabled),
    minOrderValue: num(SETTING_KEYS.minOrderValue, d.minOrderValue),
    wholesaleEnabled: bool(SETTING_KEYS.wholesaleEnabled, d.wholesaleEnabled),
    wholesaleMinTraditional: num(SETTING_KEYS.wholesaleMinTraditional, d.wholesaleMinTraditional),
    wholesaleMinUv: num(SETTING_KEYS.wholesaleMinUv, d.wholesaleMinUv),
    whatsappOrderTemplate: map.get(SETTING_KEYS.whatsappOrderTemplate) || d.whatsappOrderTemplate,
  };
}

/** Images uploaded by the admin are stored as "storage:<path>" in the private bucket. */
export const STORAGE_PREFIX = "storage:";
export const IMAGE_BUCKET = "product-images";
