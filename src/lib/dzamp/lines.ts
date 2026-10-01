import type { Category } from "./types";

export interface LineConfig {
  label: string;
  sizes: string[];
  sizesNote?: string;
  sizesSelectLabel?: string;
}

export const LINE_CONFIG: Record<Category, LineConfig> = {
  infantil: {
    label: "Linha Infantil",
    sizes: ["PP"],
    sizesNote: "Tamanho único (veste 2, 3 e 4 anos)",
    sizesSelectLabel: "Tamanho único (2-4 anos)",
  },
  jovem: {
    label: "Linha Jovem",
    sizes: ["P", "M", "G"],
  },
  adulto: {
    label: "Linha Adulto",
    sizes: ["P", "M", "G", "GG"],
  },
  uv: {
    label: "UV Manga Longa",
    sizes: ["P", "M", "G", "GG"],
  },
};

export function lineFor(category: Category): LineConfig {
  return LINE_CONFIG[category] ?? LINE_CONFIG.adulto;
}

export function sizesFor(category: Category): string[] {
  return lineFor(category).sizes;
}

export const CATEGORIES: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "Ver Todos" },
  { id: "infantil", label: "Linha Infantil" },
  { id: "jovem", label: "Linha Jovem" },
  { id: "adulto", label: "Linha Adulto" },
  { id: "uv", label: "UV Manga Longa" },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  infantil: "Linha Infantil",
  jovem: "Linha Jovem",
  adulto: "Linha Adulto",
  uv: "UV Manga Longa",
};

export const CATEGORY_OPTIONS: { id: Category; label: string }[] = [
  { id: "infantil", label: "Linha Infantil" },
  { id: "jovem", label: "Linha Jovem" },
  { id: "adulto", label: "Linha Adulto" },
  { id: "uv", label: "UV Manga Longa" },
];
