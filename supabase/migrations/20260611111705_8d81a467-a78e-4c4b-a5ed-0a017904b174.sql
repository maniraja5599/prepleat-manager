
DROP POLICY "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY "own settings" ON public.app_settings;
CREATE POLICY "own settings" ON public.app_settings TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own customers" ON public.customers;
CREATE POLICY "own customers" ON public.customers TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own bookings" ON public.bookings;
CREATE POLICY "own bookings" ON public.bookings TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own payments" ON public.payments;
CREATE POLICY "own payments" ON public.payments TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY "own activity" ON public.activity_log;
CREATE POLICY "own activity" ON public.activity_log TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
