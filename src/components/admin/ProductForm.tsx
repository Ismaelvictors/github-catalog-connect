import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CATEGORY_OPTIONS, sizesFor } from "@/lib/dzamp/lines";
import { uploadProductImage, type AdminProduct, type SaveProductInput } from "@/lib/admin/products";
import type { Category, StockEntry } from "@/lib/dzamp/types";

function defaultStock(category: Category, existing?: StockEntry[]): StockEntry[] {
  const sizes = sizesFor(category);
  return sizes.map((size) => {
    const prev = existing?.find((s) => s.size === size);
    return { size, quantity: prev?.quantity ?? 0 };
  });
}

export function ProductForm({
  product,
  onCancel,
  onSave,
}: {
  product: AdminProduct | null;
  onCancel: () => void;
  onSave: (input: SaveProductInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(product?.title ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState<Category>(product?.category ?? "adulto");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [wholesalePrice, setWholesalePrice] = useState(String(product?.wholesalePrice ?? ""));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [stock, setStock] = useState<StockEntry[]>(() => defaultStock(product?.category ?? "adulto", product?.stock));
  const [imageRefs, setImageRefs] = useState<string[]>(product?.rawImages ?? []);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.images[0] ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStock((prev) => defaultStock(category, prev));
  }, [category]);

  const stockTotal = useMemo(() => stock.reduce((t, s) => t + s.quantity, 0), [stock]);

  const onFile = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const updateQty = (size: string, quantity: number) => {
    setStock((prev) => prev.map((s) => (s.size === size ? { ...s, quantity: Math.max(0, quantity) } : s)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price);
    const wholesaleNum = Number(wholesalePrice || 0);
    if (!title.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("Preço inválido.");
      return;
    }
    setSaving(true);
    try {
      let images = imageRefs;
      if (pendingFile) {
        const uploaded = await uploadProductImage(pendingFile);
        images = [uploaded];
        setImageRefs(images);
      }
      await onSave({
        id: product?.id,
        title,
        description,
        price: priceNum,
        wholesalePrice: Number.isFinite(wholesaleNum) ? wholesaleNum : 0,
        category,
        images,
        isActive,
        stock,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-head">
        <h2>{product ? "Editar produto" : "Novo produto"}</h2>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <div className="admin-form-grid">
        <div className="admin-upload">
          <label className="admin-upload-box">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview do produto" />
            ) : (
              <span>Selecionar foto ou câmera</span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="muted">JPEG, PNG ou WebP até 5 MB.</p>
        </div>

        <div className="admin-fields">
          <label>
            Nome do produto
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Camisa Canelada - Preta" required />
          </label>

          <label>
            Categoria
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-price-row">
            <label>
              Preço normal (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label>
              Preço atacado (R$)
              <input
                type="number"
                min="0"
                step="0.01"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
              />
            </label>
          </div>

          <label>
            Descrição
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={"Tipo de tecido, caimento e guia de tamanhos...\nP veste 6 a 7 anos\nM veste 8 a 11 anos"}
            />
          </label>

          <label className="admin-check">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Produto ativo na loja
          </label>
        </div>
      </div>

      <fieldset className="admin-stock">
        <legend>Grade de estoque ({stockTotal} un.)</legend>
        <div className="admin-stock-grid">
          {stock.map((s) => (
            <label key={s.size}>
              {s.size}
              <input
                type="number"
                min="0"
                step="1"
                value={s.quantity}
                onChange={(e) => updateQty(s.size, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando..." : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
