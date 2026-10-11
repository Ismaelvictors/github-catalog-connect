import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/external-db-client";
import { CAROUSEL_SETTING_KEY, DEFAULT_CAROUSEL_IMAGES, IMAGE_BUCKET, STORAGE_PREFIX } from "@/lib/dzamp/settings";

type Slide = { raw: string; url: string; file?: File; preview?: string; zoom: number; x: number; y: number; ready: boolean };
const makeSlide = (raw: string, url: string): Slide => ({ raw, url, zoom: 1, x: 50, y: 50, ready: false });

export function CarouselPanel({ onSaved }: { onSaved: () => void }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const drags = useRef<( { x: number; y: number; cropX: number; cropY: number } | null)[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("settings").select("key,value").eq("key", CAROUSEL_SETTING_KEY).maybeSingle();
      let raw: string[] = DEFAULT_CAROUSEL_IMAGES;
      if (data?.value) {
        try { const parsed: unknown = JSON.parse(data.value); if (Array.isArray(parsed)) raw = parsed.map(String); } catch { /* use defaults */ }
      }
      const paths = raw.filter((item) => item.startsWith(STORAGE_PREFIX)).map((item) => item.slice(STORAGE_PREFIX.length));
      const signed = new Map<string, string>();
      if (paths.length) {
        const { data: urls } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 3600);
        for (const item of urls ?? []) if (item.path && item.signedUrl) signed.set(item.path, item.signedUrl);
      }
      if (alive) {
        setSlides(raw.map((item) => makeSlide(item, item.startsWith(STORAGE_PREFIX) ? signed.get(item.slice(STORAGE_PREFIX.length)) ?? "" : item)).filter((item) => item.url));
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => () => { slides.forEach((slide) => { if (slide.preview) URL.revokeObjectURL(slide.preview); }); }, [slides]);

  const update = (index: number, updater: (slide: Slide) => Slide) => setSlides((all) => all.map((slide, i) => i === index ? updater(slide) : slide));
  const cropFile = async (slide: Slide, index: number) => {
    if (!slide.file) return slide.raw;
    const img = images.current[index];
    if (!img || !slide.ready) throw new Error("Aguarde a prévia da imagem carregar.");
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 1000;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível preparar o corte da imagem.");
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight) * slide.zoom;
    const width = img.naturalWidth * scale; const height = img.naturalHeight * scale;
    ctx.drawImage(img, (canvas.width - width) * slide.x / 100, (canvas.height - height) * slide.y / 100, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("Não foi possível gerar a imagem cortada.");
    const file = new File([blob], "slide-cortado.jpg", { type: "image/jpeg" });
    const path = `carousel/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type });
    if (error) throw new Error("Falha ao enviar a imagem do carrossel.");
    return STORAGE_PREFIX + path;
  };

  const addSlide = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage({ error: true, text: "Selecione um arquivo de imagem." });
    if (file.size > 10 * 1024 * 1024) return setMessage({ error: true, text: "A imagem deve ter no máximo 10 MB." });
    const preview = URL.createObjectURL(file);
    setSlides((all) => [...all, { ...makeSlide("", preview), file, preview }]);
    setMessage(null);
  };

  const save = async () => {
    setMessage(null);
    if (!slides.length) return setMessage({ error: true, text: "Adicione ao menos uma imagem ao carrossel." });
    setBusy(true);
    const uploaded: string[] = [];
    try {
      const values: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        const value = await cropFile(slides[i], i);
        values.push(value);
        if (value.startsWith(STORAGE_PREFIX) && value !== slides[i].raw) uploaded.push(value.slice(STORAGE_PREFIX.length));
      }
      const { error } = await supabase.from("settings").upsert({ key: CAROUSEL_SETTING_KEY, value: JSON.stringify(values), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw new Error("Não foi possível salvar o carrossel.");
      const oldPaths = slides.map((slide) => slide.raw).filter((value) => value.startsWith(STORAGE_PREFIX) && !values.includes(value)).map((value) => value.slice(STORAGE_PREFIX.length));
      if (oldPaths.length) await supabase.storage.from(IMAGE_BUCKET).remove(oldPaths);
      setSlides(values.map((value, i) => makeSlide(value, slides[i].url)));
      setMessage({ error: false, text: "Imagens do carrossel salvas!" });
      onSaved();
    } catch (e) {
      if (uploaded.length) await supabase.storage.from(IMAGE_BUCKET).remove(uploaded);
      setMessage({ error: true, text: e instanceof Error ? e.message : "Erro ao salvar as imagens." });
    } finally { setBusy(false); }
  };

  if (loading) return <p className="muted">Carregando imagens do carrossel...</p>;

  return <section className="admin-settings">
    <div className="admin-card admin-carousel-card">
      <h3>Carrossel da página inicial</h3>
        <p className="muted">Adicione imagens e ajuste o enquadramento. A área exibida segue a proporção do carrossel da loja.</p>
      {slides.map((slide, index) => <div className="carousel-editor-slide" key={`${index}-${slide.raw}-${slide.preview ?? ""}`}>
        <div className={`carousel-editor-frame${slide.file ? " is-cropping" : ""}`} ref={(node) => { frames.current[index] = node; }}
          onPointerDown={(event) => { if (!slide.file || (event.target as HTMLElement).closest("input")) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); drags.current[index] = { x: event.clientX, y: event.clientY, cropX: slide.x, cropY: slide.y }; }}
          onPointerMove={(event) => { const drag = drags.current[index]; const frame = frames.current[index]; if (!drag || !frame) return; const rect = frame.getBoundingClientRect(); const range = 100 / slide.zoom; update(index, (s) => ({ ...s, x: Math.max(0, Math.min(100, drag.cropX - ((event.clientX - drag.x) / rect.width) * range)), y: Math.max(0, Math.min(100, drag.cropY - ((event.clientY - drag.y) / rect.height) * range)) })); }}
          onPointerUp={() => { drags.current[index] = null; }} onPointerCancel={() => { drags.current[index] = null; }}>
          <img ref={(node) => { images.current[index] = node; }} src={slide.url} alt={`Prévia do slide ${index + 1}`} onLoad={() => update(index, (s) => ({ ...s, ready: true }))}
            style={slide.file && images.current[index] ? (() => { const aspect = images.current[index]!.naturalWidth / images.current[index]!.naturalHeight; const w = Math.max(100, (aspect > 1.6 ? aspect / 1.6 : 1) * slide.zoom * 100); const h = Math.max(100, (1.6 / aspect > 1 ? 1.6 / aspect : 1) * slide.zoom * 100); return { width: `${w}%`, height: `${h}%`, left: `calc((100% - ${w}%) * ${slide.x / 100})`, top: `calc((100% - ${h}%) * ${slide.y / 100})` }; })() : undefined} />
          {slide.file && <span>Arraste para ajustar</span>}
        </div>
        {slide.file && <div className="admin-crop-zoom"><button type="button" aria-label="Diminuir zoom" onClick={() => update(index, (s) => ({ ...s, zoom: Math.max(1, +(s.zoom - .1).toFixed(2)) }))}>−</button><input aria-label="Zoom do corte" type="range" min="1" max="3" step="0.01" value={slide.zoom} onChange={(e) => update(index, (s) => ({ ...s, zoom: Number(e.target.value) }))} /><button type="button" aria-label="Aumentar zoom" onClick={() => update(index, (s) => ({ ...s, zoom: Math.min(3, +(s.zoom + .1).toFixed(2)) }))}>+</button></div>}
        <div className="carousel-editor-actions"><label className="btn">{slide.file ? "Trocar imagem" : "Substituir imagem"}<input type="file" accept="image/*" onChange={(e) => { addSlideAt(index, e.target.files?.[0]); e.currentTarget.value = ""; }} /></label><button className="btn" type="button" onClick={() => setSlides((all) => all.filter((_, i) => i !== index))}>Remover</button></div>
      </div>)}
      <div className="carousel-editor-actions"><label className="btn">+ Adicionar imagem<input type="file" accept="image/*" onChange={(e) => { addSlide(e.target.files?.[0]); e.currentTarget.value = ""; }} /></label></div>
      {message && <p className={message.error ? "field-error" : "admin-ok"}>{message.text}</p>}
      <button className="btn btn-primary" type="button" onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar carrossel"}</button>
    </div>
  </section>;

  function addSlideAt(index: number, file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage({ error: true, text: "Selecione um arquivo de imagem." });
    if (file.size > 10 * 1024 * 1024) return setMessage({ error: true, text: "A imagem deve ter no máximo 10 MB." });
    const preview = URL.createObjectURL(file);
    setSlides((all) => all.map((slide, i) => i === index ? { ...makeSlide("", preview), file, preview } : slide));
    setMessage(null);
  }
}
