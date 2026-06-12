
DROP POLICY IF EXISTS "own activity" ON public.activity_log;
CREATE POLICY "own activity" ON public.activity_log FOR ALL TO authenticated
  USING (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "own settings" ON public.app_settings;
CREATE POLICY "own settings" ON public.app_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "owners can delete their requests" ON public.booking_requests;
CREATE POLICY "owners can delete their requests" ON public.booking_requests FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "owners can update their requests" ON public.booking_requests;
CREATE POLICY "owners can update their requests" ON public.booking_requests FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  WITH CHECK (owner_user_id = auth.uid() AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "owners can view their requests" ON public.booking_requests;
CREATE POLICY "owners can view their requests" ON public.booking_requests FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "own bookings" ON public.bookings;
CREATE POLICY "own bookings" ON public.bookings FOR ALL TO authenticated
  USING (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "own customers" ON public.customers;
CREATE POLICY "own customers" ON public.customers FOR ALL TO authenticated
  USING (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);

DROP POLICY IF EXISTS "own payments" ON public.payments;
CREATE POLICY "own payments" ON public.payments FOR ALL TO authenticated
  USING (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false)
  WITH CHECK (auth.uid() = user_id AND COALESCE(((auth.jwt() ->> 'is_anonymous'))::boolean, false) = false);
