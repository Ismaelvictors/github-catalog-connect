ALTER TABLE public.products
  ADD COLUMN is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;

CREATE INDEX products_featured_order_idx
  ON public.products (featured_order, sort_order, created_at DESC)
  WHERE is_active = true AND is_featured = true;
