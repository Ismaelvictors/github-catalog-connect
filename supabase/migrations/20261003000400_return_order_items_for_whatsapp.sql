CREATE OR REPLACE FUNCTION public.place_order(_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  entry record;
  product record;
  stock_row record;
  traditional_qty integer := 0;
  uv_qty integer := 0;
  wholesale_enabled boolean;
  traditional_min integer;
  uv_min integer;
  minimum_enabled boolean;
  minimum_value numeric;
  subtotal_value numeric := 0;
  total_value numeric := 0;
  unit_value numeric;
  order_id uuid;
  order_code text;
  problems jsonb := '[]'::jsonb;
  normalized jsonb;
  confirmed_items jsonb := '[]'::jsonb;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Sacola inválida';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_items) i
    WHERE jsonb_typeof(i) <> 'object'
      OR jsonb_typeof(i->'product_id') <> 'string'
      OR jsonb_typeof(i->'size') <> 'string'
      OR jsonb_typeof(i->'qty') <> 'number'
      OR (i->>'qty') !~ '^[1-9][0-9]{0,2}$'
      OR length(i->>'size') NOT BETWEEN 1 AND 40
  ) THEN RAISE EXCEPTION 'Itens inválidos'; END IF;
  SELECT jsonb_agg(jsonb_build_object('product_id', product_id, 'size', size, 'qty', qty) ORDER BY product_id, size)
  INTO normalized FROM (
    SELECT (i->>'product_id')::uuid AS product_id, i->>'size' AS size, sum((i->>'qty')::integer)::integer AS qty
    FROM jsonb_array_elements(_items) i GROUP BY 1, 2
  ) grouped;
  SELECT coalesce((SELECT value FROM public.settings WHERE key='wholesale_enabled'), 'true')::boolean INTO wholesale_enabled;
  SELECT coalesce((SELECT value FROM public.settings WHERE key='wholesale_min_traditional'), '20')::integer INTO traditional_min;
  SELECT coalesce((SELECT value FROM public.settings WHERE key='wholesale_min_uv'), '30')::integer INTO uv_min;
  SELECT coalesce((SELECT value FROM public.settings WHERE key='min_order_enabled'), 'true')::boolean INTO minimum_enabled;
  SELECT coalesce((SELECT value FROM public.settings WHERE key='min_order_value'), '200')::numeric INTO minimum_value;
  FOR entry IN SELECT * FROM jsonb_to_recordset(normalized) AS x(product_id uuid, size text, qty integer) ORDER BY product_id, size LOOP
    SELECT * INTO product FROM public.products WHERE id = entry.product_id AND is_active;
    IF NOT FOUND THEN
      problems := problems || jsonb_build_object('product_id', entry.product_id, 'size', entry.size, 'available', 0);
      CONTINUE;
    END IF;
    SELECT * INTO stock_row FROM public.product_stock WHERE product_id = entry.product_id AND size = entry.size FOR UPDATE;
    IF NOT FOUND OR stock_row.quantity < entry.qty THEN
      problems := problems || jsonb_build_object('product_id', entry.product_id, 'size', entry.size, 'available', coalesce(stock_row.quantity, 0));
      CONTINUE;
    END IF;
    IF product.category = 'uv' THEN uv_qty := uv_qty + entry.qty;
    ELSE traditional_qty := traditional_qty + entry.qty; END IF;
  END LOOP;
  IF jsonb_array_length(problems) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'stock', 'problems', problems);
  END IF;
  FOR entry IN SELECT * FROM jsonb_to_recordset(normalized) AS x(product_id uuid, size text, qty integer) LOOP
    SELECT * INTO product FROM public.products WHERE id = entry.product_id;
    subtotal_value := subtotal_value + product.price * entry.qty;
    IF wholesale_enabled AND product.wholesale_price > 0 AND product.wholesale_price < product.price AND (
      (product.category = 'uv' AND uv_qty >= uv_min) OR
      (product.category <> 'uv' AND traditional_qty >= traditional_min)
    ) THEN unit_value := product.wholesale_price; ELSE unit_value := product.price; END IF;
    total_value := total_value + unit_value * entry.qty;
    confirmed_items := confirmed_items || jsonb_build_object('title', product.title, 'size', entry.size, 'qty', entry.qty, 'unit_price', unit_value);
  END LOOP;
  IF minimum_enabled AND total_value < minimum_value THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'minimum', 'minimum', minimum_value);
  END IF;
  INSERT INTO public.orders (subtotal, discount, total)
  VALUES (subtotal_value, subtotal_value - total_value, total_value)
  RETURNING id, code INTO order_id, order_code;
  FOR entry IN SELECT * FROM jsonb_to_recordset(normalized) AS x(product_id uuid, size text, qty integer) LOOP
    SELECT * INTO product FROM public.products WHERE id = entry.product_id;
    IF wholesale_enabled AND product.wholesale_price > 0 AND product.wholesale_price < product.price AND (
      (product.category = 'uv' AND uv_qty >= uv_min) OR
      (product.category <> 'uv' AND traditional_qty >= traditional_min)
    ) THEN unit_value := product.wholesale_price; ELSE unit_value := product.price; END IF;
    INSERT INTO public.order_items (order_id, product_id, title, size, qty, unit_price)
    VALUES (order_id, product.id, product.title, entry.size, entry.qty, unit_value);
    UPDATE public.product_stock SET quantity = quantity - entry.qty
    WHERE product_id = entry.product_id AND size = entry.size;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'code', order_code, 'subtotal', subtotal_value,
    'discount', subtotal_value - total_value, 'total', total_value, 'items', confirmed_items);
END;
$$;
REVOKE ALL ON FUNCTION public.place_order(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO anon, authenticated;