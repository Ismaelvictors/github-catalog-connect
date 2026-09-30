CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  category text NOT NULL CHECK (category IN ('infantil','jovem','adulto','uv')),
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.settings TO anon;
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are publicly readable"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.settings (key, value) VALUES ('whatsapp_number', '5500999999999');

INSERT INTO public.products (title, description, price, category, images, sizes, sort_order) VALUES
('Camiseta Infantil DZAMP Classic', 'Camiseta infantil em malha premium com acabamento reforçado. Conforto e estilo para o dia a dia.', 49.90, 'infantil', '["/images/infantil-1.jpg"]'::jsonb, '["PP"]'::jsonb, 1),
('Moletom Infantil DZAMP Navy', 'Moletom infantil macio e aquecido, ideal para os dias mais frescos com a atitude DZAMP.', 89.90, 'infantil', '["/images/infantil-2.jpg"]'::jsonb, '["PP"]'::jsonb, 2),
('Camiseta Jovem DZAMP Street', 'Camiseta em algodão premium com modelagem jovem e caimento moderno.', 59.90, 'jovem', '["/images/adulto-1.jpg"]'::jsonb, '["P","M","G"]'::jsonb, 3),
('Camiseta Adulto Premium Preta', 'Camiseta em algodão premium, modelagem moderna e toque suave. Um clássico DZAMP.', 69.90, 'adulto', '["/images/adulto-1.jpg"]'::jsonb, '["P","M","G","GG"]'::jsonb, 4),
('Polo DZAMP Vermelha', 'Polo clássica em piquet premium, com detalhes bordados. Elegância esportiva.', 99.90, 'adulto', '["/images/adulto-2.jpg"]'::jsonb, '["P","M","G","GG"]'::jsonb, 5),
('Manga Longa Proteção UV Branca', 'Camiseta manga longa com proteção UV, tecido leve e de secagem rápida. Unissex.', 89.90, 'uv', '["/images/uv-1.jpg"]'::jsonb, '["P","M","G","GG"]'::jsonb, 6),
('Manga Longa Proteção UV Cinza (Unissex)', 'Proteção solar com estilo: tecido técnico leve, ideal para esportes ao ar livre. Unissex.', 89.90, 'uv', '["/images/uv-2.jpg"]'::jsonb, '["P","M","G","GG"]'::jsonb, 7);
