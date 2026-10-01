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
}

export interface StoreSettings {
  whatsappNumber: string;
  minOrderEnabled: boolean;
  minOrderValue: number;
  wholesaleEnabled: boolean;
  wholesaleMinTraditional: number;
  wholesaleMinUv: number;
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
