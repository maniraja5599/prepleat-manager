
-- Restrict execution of SECURITY DEFINER functions to the postgres role only.
-- These are invoked by triggers / internal usage and should not be callable
-- directly by API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Block anonymous (is_anonymous=true) sign-ins from accessing the profiles table.
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = id
    AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false
  )
  WITH CHECK (
    auth.uid() = id
    AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false
  );
