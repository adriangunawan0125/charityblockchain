
-- 1. user_roles: drop public SELECT, allow only self-read
DROP POLICY IF EXISTS "Roles viewable by everyone" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. has_role: switch to SECURITY INVOKER (relies on user_roles self-SELECT policy)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- 3. donations: replace permissive INSERT (true) with scoped check
DROP POLICY IF EXISTS "Anyone can record donations" ON public.donations;
CREATE POLICY "Users record own donations"
  ON public.donations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NULL AND donor_user_id IS NULL)
    OR (auth.uid() IS NOT NULL AND donor_user_id = auth.uid())
  );
