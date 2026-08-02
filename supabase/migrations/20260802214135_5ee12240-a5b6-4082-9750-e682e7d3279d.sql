-- 1. Couriers
CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  website text,
  tracking_url_template text,
  counties text[] NOT NULL DEFAULT '{}',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.couriers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couriers are viewable by everyone" ON public.couriers FOR SELECT USING (true);
CREATE POLICY "Staff manage couriers" ON public.couriers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER update_couriers_updated_at BEFORE UPDATE ON public.couriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS courier_id uuid REFERENCES public.couriers(id) ON DELETE SET NULL;

-- 2. Auth settings (single row)
CREATE TABLE public.auth_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_enabled boolean NOT NULL DEFAULT true,
  signup_enabled boolean NOT NULL DEFAULT true,
  google_enabled boolean NOT NULL DEFAULT false,
  apple_enabled boolean NOT NULL DEFAULT false,
  social_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.auth_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.auth_settings TO authenticated;
GRANT ALL ON public.auth_settings TO service_role;
ALTER TABLE public.auth_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth settings are viewable by everyone" ON public.auth_settings FOR SELECT USING (true);
CREATE POLICY "Admins update auth settings" ON public.auth_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert auth settings" ON public.auth_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_auth_settings_updated_at BEFORE UPDATE ON public.auth_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.auth_settings (email_enabled, signup_enabled, google_enabled) VALUES (true, true, true);

-- 3. Branding + socials
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text;

-- 4. Manual payment verification
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 5. Stock enforcement
CREATE OR REPLACE FUNCTION public.reserve_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE available integer;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT stock INTO available FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF available IS NULL THEN RETURN NEW; END IF;
  IF available < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for %: % left', NEW.product_name, available;
  END IF;
  UPDATE public.products SET stock = stock - NEW.quantity, updated_at = now() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reserve_stock_on_order_item BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.reserve_product_stock();