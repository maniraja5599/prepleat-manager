
-- 1. Lock down booking_requests INSERT: only authenticated owners can self-insert.
-- Anonymous public form submissions go through the trusted server route which uses the service role.
DROP POLICY IF EXISTS "anyone can submit a booking request" ON public.booking_requests;
CREATE POLICY "owners can insert their own requests"
  ON public.booking_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- 2. Revoke EXECUTE on internal trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 3. Recreate profile policy explicitly scoped to authenticated role only
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
