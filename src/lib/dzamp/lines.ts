import type { Category } from "./types";

export interface LineColor {
  name: string;
  hex: string;
}

export interface LineConfig {
  label: string;
  sizes: string[];
  sizesNote?: string;
  sizesSelectLabel?: string;
  colors: LineColor[];
  estampas: string[];
  hasEstampa: boolean;
}

const COLORS: LineColor[] = [
  { name: "Vermelho", hex: "#d62828" },
  { name: "Preto", hex: "#111418" },
  { name: "Branco", hex: "#ffffff" },
  { name: "Azul Marinho", hex: "#1d3557" },
  { name: "Cinza", hex: "#9ca3af" },
  { name: "Bege", hex: "#e5d3b3" },
  { name: "Verde", hex: "#2a9d8f" },
  { name: "Amarelo", hex: "#f4c430" },
  { name: "Rosa", hex: "#e76f8a" },
];

const ESTAMPAS = ["Adidas", "Nike", "Boss", "Lacoste", "DZAMP"];

export const LINE_CONFIG: Record<Category, LineConfig> = {
  infantil: {
    label: "Linha Infantil",
    sizes: ["PP"],
    sizesNote: "Tamanho único (veste 2, 3 e 4 anos)",
    sizesSelectLabel: "Tamanho único (2-4 anos)",
    colors: COLORS,
    estampas: ESTAMPAS,
    hasEstampa: true,
  },
  jovem: {
    label: "Linha Jovem",
    sizes: ["P", "M", "G"],
    colors: COLORS,
    estampas: ESTAMPAS,
    hasEstampa: true,
  },
  adulto: {
    label: "Linha Adulto",
    sizes: ["P", "M", "G", "GG"],
    colors: COLORS,
    estampas: ESTAMPAS,
    hasEstampa: true,
  },
  uv: {
    label: "UV Manga Longa",
    sizes: ["P", "M", "G", "GG"],
    colors: COLORS,
    estampas: [],
    hasEstampa: false,
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
