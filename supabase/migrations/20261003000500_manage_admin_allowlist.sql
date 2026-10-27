CREATE TABLE public.admin_email_allowlist (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_email_allowlist IS
  'Verified email addresses permitted to receive the application admin role. Manage through trusted SQL only.';

ALTER TABLE public.admin_email_allowlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_email_allowlist FROM PUBLIC, anon, authenticated;

INSERT INTO public.admin_email_allowlist (email)
VALUES ('victors.testes.dev@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS assigned
    WHERE assigned.user_id = _user_id
      AND assigned.role = _role
      AND (
        _role <> 'admin'::public.app_role
        OR EXISTS (
          SELECT 1
          FROM auth.users AS u
          JOIN public.admin_email_allowlist AS allowed
            ON allowed.email = lower(btrim(u.email))
          WHERE u.id = _user_id
            AND u.email_confirmed_at IS NOT NULL
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  verified_email text;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(btrim(u.email))
  INTO verified_email
  FROM auth.users AS u
  WHERE u.id = current_user_id
    AND u.email_confirmed_at IS NOT NULL;

  IF verified_email IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_email_allowlist AS allowed
    WHERE allowed.email = verified_email
  ) THEN
    DELETE FROM public.user_roles
    WHERE user_id = current_user_id AND role = 'admin';
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_owner_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;
