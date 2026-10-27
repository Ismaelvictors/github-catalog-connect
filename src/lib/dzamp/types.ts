export type Category = "infantil" | "jovem" | "adulto" | "uv";

export interface StockEntry {
  size: string;
  quantity: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  wholesalePrice: number;
  category: Category;
  images: string[];
  stock: StockEntry[];
  isFeatured: boolean;
  featuredOrder: number;
}

export interface StoreSettings {
  whatsappNumber: string;
  instagramHandle: string;
  contactEmail: string;
  minOrderEnabled: boolean;
  minOrderValue: number;
  wholesaleEnabled: boolean;
  wholesaleMinTraditional: number;
  wholesaleMinUv: number;
  whatsappOrderTemplate: string;
}

export interface CartItem {
  key: string;
  productId: string;
  title: string;
  price: number;
  wholesalePrice: number;
  category: Category;
  size: string;
  qty: number;
  image: string;
}
