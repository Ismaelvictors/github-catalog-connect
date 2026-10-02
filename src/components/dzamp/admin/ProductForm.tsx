import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABELS, LINE_CONFIG } from "@/lib/dzamp/lines";
import { IMAGE_BUCKET, STORAGE_PREFIX } from "@/lib/dzamp/settings";
import type { Category, StockEntry } from "@/lib/dzamp/types";

export interface AdminProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  wholesalePrice: number;
  category: Category;
  isActive: boolean;
  imageRaw: string;
  imageUrl: string;
  stock: StockEntry[];
}

const SIZE_PRESETS: Record<Category, string[]> = {
  infantil: LINE_CONFIG.infantil.sizes,
  jovem: ["P", "M", "G"],
  adulto: ["P", "M", "G", "GG"],
  uv: ["P", "M", "G", "GG"],
};

function parseMoney(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
const money = (n: number) => (Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "");

export function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(product?.title ?? "");
  const [category, setCategory] = useState<Category>(product?.category ?? "adulto");
  const [price, setPrice] = useState(product ? money(product.price) : "");
  const [wholesale, setWholesale] = useState(product ? money(product.wholesalePrice) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [stock, setStock] = useState<StockEntry[]>(
    product?.stock.length ? product.stock : SIZE_PRESETS.adulto.map((size) => ({ size, quantity: 0 })),
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.imageUrl ?? "");
  const [newSize, setNewSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCategory = (c: Category) => {
    setCategory(c);
    if (!product && stock.every((s) => s.quantity === 0))
      setStock(SIZE_PRESETS[c].map((size) => ({ size, quantity: 0 })));
  };

  const addSize = () => {
    const s = newSize.trim().toUpperCase();
    if (!s || stock.some((x) => x.size.toUpperCase() === s)) return;
    setStock([...stock, { size: s, quantity: 0 }]);
    setNewSize("");
  };

  const save = async () => {
    setError(null);
    const p = parseMoney(price);
    const w = parseMoney(wholesale || price);
    if (!title.trim()) return setError("Informe o nome do produto.");
    if (!(p > 0)) return setError("Informe um preço normal válido.");
    if (!(w > 0) || w > p) return setError("O preço de atacado deve ser maior que zero e não maior que o preço normal.");
    if (!stock.length) return setError("Cadastre ao menos um tamanho.");
    if (!file && !product?.imageRaw) return setError("Adicione uma foto do produto.");

    setBusy(true);
    try {
      let image = product?.imageRaw ?? "";
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
        if (up.error) throw new Error("Falha ao enviar a foto.");
        if (image.startsWith(STORAGE_PREFIX))
          await supabase.storage.from(IMAGE_BUCKET).remove([image.slice(STORAGE_PREFIX.length)]);
        image = STORAGE_PREFIX + path;
      }
      const row = {
        title: title.trim(),
        category,
        price: p,
        wholesale_price: w,
        description: description.trim(),
        images: [image],
      };
      let id = product?.id;
      if (id) {
        const r = await supabase.from("products").update(row).eq("id", id);
        if (r.error) throw r.error;
      } else {
        const r = await supabase.from("products").insert(row).select("id").single();
        if (r.error) throw r.error;
        id = r.data.id;
      }
      // Sync stock
      const keep = stock.map((s) => s.size);
      const removed = (product?.stock ?? []).filter((s) => !keep.includes(s.size)).map((s) => s.size);
      if (removed.length) await supabase.from("product_stock").delete().eq("product_id", id).in("size", removed);
      if (!id) throw new Error("Não foi possível identificar o produto.");
      const up = await supabase.from("product_stock").upsert(
        stock.map((s, i) => ({ product_id: id, size: s.size, quantity: Math.max(0, Math.floor(s.quantity)), sort_order: i })),
        { onConflict: "product_id,size" },
      );
      if (up.error) throw up.error;
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal admin-form" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="admin-form-head">
          <h2>{product ? "Editar produto" : "Novo produto"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="admin-form-body">
          <label className="admin-photo">
            {preview ? <img src={preview} alt="" /> : <span>Toque para adicionar foto</span>}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 10 * 1024 * 1024) return setError("A foto deve ter no máximo 10 MB.");
                setFile(f);
                setPreview(URL.createObjectURL(f));
              }}
            />
          </label>

          <label>
            Nome do produto (com a cor)
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Camisa Juvenil Canelado - Azul Marinho" />
          </label>

          <label>
            Categoria
            <select value={category} onChange={(e) => onCategory(e.target.value as Category)}>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>

          <div className="admin-row2">
            <label>
              Preço normal (R$)
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="20,00" />
            </label>
            <label>
              Preço atacado (R$)
              <input inputMode="decimal" value={wholesale} onChange={(e) => setWholesale(e.target.value)} placeholder="19,00" />
            </label>
          </div>

          <label>
            Descrição detalhada
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Camisa Juvenil\nTecido Canelado Premium\nGrade por Tamanho:\nP: Veste 6 a 7 anos\nM: Veste 8 a 11 anos\nG: Veste 12 a 14 anos"}
            />
          </label>

          <fieldset className="admin-stock">
            <legend>Estoque por tamanho</legend>
            {stock.map((s, i) => (
              <div key={s.size} className="admin-stock-line">
                <span>{s.size}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={s.quantity}
                  onChange={(e) =>
                    setStock(stock.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) || 0 } : x)))
                  }
                />
                <button type="button" onClick={() => setStock(stock.filter((_, j) => j !== i))} aria-label={`Remover ${s.size}`}>
                  ✕
                </button>
              </div>
            ))}
            <div className="admin-stock-add">
              <input
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="Novo tamanho (ex.: GG)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSize();
                  }
                }}
              />
              <button type="button" className="btn" onClick={addSize}>Adicionar</button>
            </div>
          </fieldset>

          {error && <p className="field-error">{error}</p>}
        </div>

        <div className="admin-form-foot">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
