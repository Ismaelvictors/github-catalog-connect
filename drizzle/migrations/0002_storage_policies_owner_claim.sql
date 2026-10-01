CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  em text := lower(coalesce(auth.jwt()->>'email',''));
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF em = 'victors.testes.dev@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$;
REVOKE ALL ON FUNCTION public.claim_owner_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;