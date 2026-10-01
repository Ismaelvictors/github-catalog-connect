CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Products: new columns
ALTER TABLE public.products ADD COLUMN wholesale_price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
UPDATE public.products SET wholesale_price = price WHERE wholesale_price = 0;
COMMENT ON COLUMN public.products.sizes IS 'DEPRECATED: replaced by product_stock';

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Stock
CREATE TABLE public.product_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (product_id, size)
);
GRANT SELECT ON public.product_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_stock TO authenticated;
GRANT ALL ON public.product_stock TO service_role;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads stock" ON public.product_stock FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert stock" ON public.product_stock FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update stock" ON public.product_stock FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete stock" ON public.product_stock FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Backfill stock from legacy sizes (qty 0)
INSERT INTO public.product_stock (product_id, size, quantity, sort_order)
SELECT p.id, s.value, 0, s.ord::int
FROM public.products p, jsonb_array_elements_text(p.sizes) WITH ORDINALITY AS s(value, ord)
ON CONFLICT DO NOTHING;

-- Settings: admin writes
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
CREATE POLICY "Admins insert settings" ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings" ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE SEQUENCE public.order_code_seq START 1001;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('DZ-' || nextval('public.order_code_seq')::text),
  subtotal numeric NOT NULL,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  size text NOT NULL,
  qty integer NOT NULL,
  unit_price numeric NOT NULL
);
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Place order atomically: validates stock, applies wholesale + minimum, decrements stock
CREATE OR REPLACE FUNCTION public.place_order(_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  it jsonb;
  p record;
  st record;
  trad_qty int := 0;
  uv_qty int := 0;
  w_enabled boolean;
  w_trad int;
  w_uv int;
  m_enabled boolean;
  m_value numeric;
  subtotal numeric := 0;
  total numeric := 0;
  unit numeric;
  oid uuid;
  ocode text;
  problems jsonb := '[]'::jsonb;
BEGIN
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Sacola vazia';
  END IF;

  SELECT COALESCE((SELECT value FROM settings WHERE key='wholesale_enabled'),'true')::boolean INTO w_enabled;
  SELECT COALESCE((SELECT value FROM settings WHERE key='wholesale_min_traditional'),'20')::int INTO w_trad;
  SELECT COALESCE((SELECT value FROM settings WHERE key='wholesale_min_uv'),'30')::int INTO w_uv;
  SELECT COALESCE((SELECT value FROM settings WHERE key='min_order_enabled'),'true')::boolean INTO m_enabled;
  SELECT COALESCE((SELECT value FROM settings WHERE key='min_order_value'),'200')::numeric INTO m_value;

  -- lock & validate
  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF (it->>'qty')::int <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
    SELECT * INTO p FROM products WHERE id = (it->>'product_id')::uuid AND is_active;
    IF NOT FOUND THEN
      problems := problems || jsonb_build_object('product_id', it->>'product_id', 'size', it->>'size', 'available', 0);
      CONTINUE;
    END IF;
    SELECT * INTO st FROM product_stock WHERE product_id = p.id AND size = it->>'size' FOR UPDATE;
    IF NOT FOUND OR st.quantity < (it->>'qty')::int THEN
      problems := problems || jsonb_build_object('product_id', p.id, 'size', it->>'size', 'available', COALESCE(st.quantity,0));
      CONTINUE;
    END IF;
    IF p.category = 'uv' THEN uv_qty := uv_qty + (it->>'qty')::int;
    ELSE trad_qty := trad_qty + (it->>'qty')::int; END IF;
  END LOOP;

  IF jsonb_array_length(problems) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'stock', 'problems', problems);
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO p FROM products WHERE id = (it->>'product_id')::uuid;
    subtotal := subtotal + p.price * (it->>'qty')::int;
    IF w_enabled AND p.wholesale_price > 0 AND (
      (p.category = 'uv' AND uv_qty >= w_uv) OR (p.category <> 'uv' AND trad_qty >= w_trad)
    ) THEN unit := p.wholesale_price; ELSE unit := p.price; END IF;
    total := total + unit * (it->>'qty')::int;
  END LOOP;

  IF m_enabled AND total < m_value THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'minimum', 'minimum', m_value);
  END IF;

  INSERT INTO orders (subtotal, discount, total) VALUES (subtotal, subtotal - total, total)
    RETURNING id, code INTO oid, ocode;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO p FROM products WHERE id = (it->>'product_id')::uuid;
    IF w_enabled AND p.wholesale_price > 0 AND (
      (p.category = 'uv' AND uv_qty >= w_uv) OR (p.category <> 'uv' AND trad_qty >= w_trad)
    ) THEN unit := p.wholesale_price; ELSE unit := p.price; END IF;
    INSERT INTO order_items (order_id, product_id, title, size, qty, unit_price)
      VALUES (oid, p.id, p.title, it->>'size', (it->>'qty')::int, unit);
    UPDATE product_stock SET quantity = quantity - (it->>'qty')::int
      WHERE product_id = p.id AND size = it->>'size';
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'code', ocode, 'subtotal', subtotal, 'discount', subtotal - total, 'total', total);
END;
$$;
REVOKE ALL ON FUNCTION public.place_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;