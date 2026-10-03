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

INSERT INTO public.settings (key, value) VALUES ('whatsapp_number', '5585981762787');


