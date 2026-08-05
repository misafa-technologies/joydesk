ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS courier_contact text;

CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_events_order_id_idx ON public.order_events(order_id);

GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view their own order events"
  ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_events.order_id AND o.user_id = auth.uid()));

CREATE POLICY "Staff view all order events"
  ON public.order_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff add order events"
  ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND actor_id = auth.uid());