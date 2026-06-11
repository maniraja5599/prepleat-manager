
-- 1. Lock down handle_new_user (still runs as trigger; revoke direct execute)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 2. Add owner scoping to booking_requests
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS booking_requests_owner_user_id_idx
  ON public.booking_requests(owner_user_id);

-- Drop overly permissive policies
DROP POLICY IF EXISTS "authenticated can view requests" ON public.booking_requests;
DROP POLICY IF EXISTS "authenticated can update requests" ON public.booking_requests;
DROP POLICY IF EXISTS "authenticated can delete requests" ON public.booking_requests;
DROP POLICY IF EXISTS "anyone can submit a booking request" ON public.booking_requests;

-- Public submit, but recipient must be provided
CREATE POLICY "anyone can submit a booking request"
  ON public.booking_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (owner_user_id IS NOT NULL);

-- Owners (only) can view/update/delete their incoming requests
CREATE POLICY "owners can view their requests"
  ON public.booking_requests
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "owners can update their requests"
  ON public.booking_requests
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "owners can delete their requests"
  ON public.booking_requests
  FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());
