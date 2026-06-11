
CREATE TABLE public.booking_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT 'prepleat',
  saree_count INTEGER NOT NULL DEFAULT 1,
  delivery_date DATE,
  delivery_time TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit a booking request" ON public.booking_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "authenticated can view requests" ON public.booking_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated can update requests" ON public.booking_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated can delete requests" ON public.booking_requests FOR DELETE TO authenticated USING (true);
