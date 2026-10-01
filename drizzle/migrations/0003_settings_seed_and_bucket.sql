-- Seed commercial settings (keep existing whatsapp_number)
INSERT INTO public.settings (key, value) VALUES
  ('min_order_value', '200'),
  ('min_order_enabled', 'true'),
  ('wholesale_enabled', 'true'),
  ('wholesale_min_traditional', '20'),
  ('wholesale_min_uv', '30')
ON CONFLICT (key) DO NOTHING;

-- Ensure product-images bucket exists (public read; upload gated by storage RLS)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;
