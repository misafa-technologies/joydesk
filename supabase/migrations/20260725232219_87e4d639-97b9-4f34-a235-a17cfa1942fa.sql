-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','staff','customer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','staff'))
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATALOG
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories staff write" ON public.categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "brands staff write" ON public.brands FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER brands_updated BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(12,2),
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  features TEXT[] NOT NULL DEFAULT '{}',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  tag TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "products staff write" ON public.products FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ADDRESSES
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  county TEXT NOT NULL,
  sub_county TEXT,
  town TEXT,
  street TEXT,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WISHLIST / CART
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cart_updated BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COUPONS
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read active" ON public.coupons FOR SELECT USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "coupons staff write" ON public.coupons FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT NOT NULL DEFAULT 'mpesa',
  delivery_method TEXT NOT NULL DEFAULT 'standard',
  county TEXT,
  sub_county TEXT,
  town TEXT,
  street TEXT,
  notes TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  coupon_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders own read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "orders own insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders staff update" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "orders staff delete" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items own read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "order items own insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order items staff write" ON public.order_items FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tracking_number TEXT NOT NULL UNIQUE,
  courier TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  current_location TEXT,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_delivery DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipments own read" ON public.shipments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "shipments staff write" ON public.shipments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  title TEXT,
  body TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (is_approved OR auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "reviews delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE TRIGGER reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id UUID,
  provider TEXT NOT NULL DEFAULT 'mpesa',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  mpesa_receipt TEXT,
  result_code TEXT,
  result_desc TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments own read" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "payments staff write" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mpesa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL DEFAULT 'sandbox',
  mode TEXT NOT NULL DEFAULT 'paybill',
  short_code TEXT,
  party_b TEXT,
  passkey TEXT,
  consumer_key TEXT,
  consumer_secret TEXT,
  callback_url TEXT,
  account_reference TEXT DEFAULT 'JoyDesk',
  transaction_desc TEXT DEFAULT 'JoyDesk Order Payment',
  whatsapp_number TEXT DEFAULT '254700000000',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mpesa_config TO authenticated;
GRANT ALL ON public.mpesa_config TO service_role;
ALTER TABLE public.mpesa_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpesa config admin only" ON public.mpesa_config FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mpesa_config_updated BEFORE UPDATE ON public.mpesa_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL DEFAULT 'JoyDesk',
  tagline TEXT NOT NULL DEFAULT 'Comfort Meets Productivity',
  support_email TEXT DEFAULT 'support@joydesk.co.ke',
  support_phone TEXT DEFAULT '+254 700 000 000',
  whatsapp_number TEXT DEFAULT '254700000000',
  free_delivery_threshold NUMERIC(12,2) NOT NULL DEFAULT 50000,
  standard_delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 500,
  express_delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 1200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.store_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED
INSERT INTO public.store_settings (store_name) VALUES ('JoyDesk');
INSERT INTO public.mpesa_config (environment, mode, short_code, party_b, account_reference) VALUES ('sandbox','paybill','174379','174379','JoyDesk');

INSERT INTO public.categories (name, slug, description) VALUES
  ('Ergonomic Chairs','chairs','Mesh, executive and gaming chairs built for all-day comfort'),
  ('Desks & Workstations','desks','Standing desks, executive desks and workstations'),
  ('Laptops','laptops','Business and creator laptops'),
  ('Monitors','monitors','Productivity and creator displays'),
  ('Accessories','accessories','Keyboards, mice, stands and cable management');

INSERT INTO public.brands (name, slug) VALUES
  ('JoyDesk','joydesk'),('Dell','dell'),('HP','hp'),('Lenovo','lenovo'),('Logitech','logitech'),('Samsung','samsung');

INSERT INTO public.products (name, slug, short_description, description, price, compare_price, sku, stock, category_id, brand_id, features, specs, rating, review_count, tag, is_featured)
SELECT v.name, v.slug, v.short_desc, v.descr, v.price, v.compare_price, v.sku, v.stock,
  (SELECT id FROM public.categories WHERE slug = v.cat), (SELECT id FROM public.brands WHERE slug = v.brand),
  v.features, v.specs::jsonb, v.rating, v.review_count, v.tag, v.featured
FROM (VALUES
  ('JoyDesk ErgoPro Mesh Chair','ergopro-mesh-chair','Breathable mesh chair with 4D armrests','Full-mesh ergonomic chair with adjustable lumbar support, 4D armrests, synchro-tilt mechanism and a 3-position lock. Built for 10-hour workdays.',32500,41000,'JD-CH-001',24,'chairs','joydesk',ARRAY['Adjustable lumbar support','4D armrests','Synchro-tilt with 3-position lock','Breathable mesh back','5-year warranty'],'{"Material":"Mesh + nylon base","Weight capacity":"150 kg","Adjustable height":"45-55 cm","Warranty":"5 years"}',4.8,64,'Best Seller',true),
  ('JoyDesk Executive Leather Chair','executive-leather-chair','Premium bonded leather executive seat','High-back executive chair in bonded leather with padded headrest, deep cushioning and smooth recline.',48900,59000,'JD-CH-002',12,'chairs','joydesk',ARRAY['Padded headrest','Bonded leather','135° recline','Heavy-duty gas lift'],'{"Material":"Bonded leather","Weight capacity":"160 kg","Warranty":"3 years"}',4.7,41,NULL,true),
  ('JoyDesk Rise Electric Standing Desk','rise-electric-standing-desk','Dual-motor sit-stand desk with memory presets','Dual-motor electric standing desk with 4 memory presets, anti-collision detection and a scratch-resistant top.',89500,105000,'JD-DK-001',9,'desks','joydesk',ARRAY['Dual motor','4 memory presets','Anti-collision','Cable tray included'],'{"Height range":"72-120 cm","Top size":"140 x 70 cm","Load":"120 kg"}',4.9,33,'New',true),
  ('JoyDesk Compact Study Desk','compact-study-desk','Space-saving desk for home offices','Compact 100 x 55 cm desk with a steel frame and laminated top, ideal for apartments and student rooms.',14900,18500,'JD-DK-002',40,'desks','joydesk',ARRAY['Steel frame','Scratch resistant top','Tool-light assembly'],'{"Top size":"100 x 55 cm","Load":"60 kg"}',4.5,58,'Flash Deal',true),
  ('Dell Latitude 5450 Business Laptop','dell-latitude-5450','Intel Core Ultra 5, 16GB RAM, 512GB SSD','Business-class 14" laptop with Intel Core Ultra 5, 16GB RAM, 512GB NVMe SSD and all-day battery.',132000,145000,'DL-LT-5450',7,'laptops','dell',ARRAY['Intel Core Ultra 5','16GB RAM','512GB NVMe SSD','14" FHD+ display'],'{"CPU":"Intel Core Ultra 5","RAM":"16GB","Storage":"512GB SSD","Display":"14 inch FHD+"}',4.6,22,NULL,true),
  ('HP EliteBook 840 G11','hp-elitebook-840-g11','Lightweight enterprise laptop','Magnesium chassis enterprise laptop with Wolf Security, 16GB RAM and a 14" low-power display.',158000,172000,'HP-LT-840',5,'laptops','hp',ARRAY['16GB RAM','1TB SSD','Wolf Security','Backlit keyboard'],'{"CPU":"Intel Core Ultra 7","RAM":"16GB","Storage":"1TB SSD"}',4.7,18,NULL,false),
  ('Samsung ViewFinity 27" 4K Monitor','samsung-viewfinity-27-4k','27-inch 4K IPS with USB-C 65W','27" 4K IPS panel with 99% sRGB, USB-C 65W power delivery and a fully ergonomic stand.',54900,62000,'SM-MN-27U',15,'monitors','samsung',ARRAY['4K UHD IPS','USB-C 65W PD','Height adjustable stand','99% sRGB'],'{"Size":"27 inch","Resolution":"3840x2160","Refresh":"60Hz"}',4.8,29,'Best Seller',true),
  ('Dell 24" FHD Monitor P2425H','dell-p2425h-24','24-inch FHD IPS office monitor','Comfort-view 24" FHD IPS monitor with tilt, swivel, pivot and height adjustment.',24500,28000,'DL-MN-24',30,'monitors','dell',ARRAY['FHD IPS','Flicker-free','Fully adjustable stand'],'{"Size":"24 inch","Resolution":"1920x1080"}',4.5,37,NULL,false),
  ('Logitech MX Keys S Wireless Keyboard','logitech-mx-keys-s','Low-profile wireless productivity keyboard','Backlit low-profile wireless keyboard with smart illumination and multi-device switching.',13900,16500,'LG-AC-MXK',35,'accessories','logitech',ARRAY['Smart backlight','Multi-device','USB-C charging'],'{"Connectivity":"Bluetooth / Logi Bolt","Battery":"Up to 10 days backlit"}',4.7,52,NULL,true),
  ('Logitech MX Master 3S Mouse','logitech-mx-master-3s','8K DPI quiet-click ergonomic mouse','Ergonomic mouse with 8000 DPI sensor, MagSpeed scrolling and quiet clicks.',11900,13900,'LG-AC-MXM',28,'accessories','logitech',ARRAY['8K DPI','Quiet clicks','MagSpeed scroll'],'{"DPI":"8000","Battery":"70 days"}',4.9,74,'Best Seller',true),
  ('JoyDesk Aluminium Laptop Stand','joydesk-laptop-stand','Adjustable aluminium riser','Ventilated aluminium laptop stand, adjustable to 6 heights, fits 11-17" laptops.',4900,6500,'JD-AC-LS1',60,'accessories','joydesk',ARRAY['Aluminium build','6 height levels','Anti-slip pads'],'{"Fits":"11-17 inch","Material":"Aluminium alloy"}',4.6,45,NULL,false),
  ('Lenovo ThinkPad E16 Gen 2','lenovo-thinkpad-e16','16-inch business workhorse','16" business laptop with AMD Ryzen 7, 16GB RAM and 512GB SSD for teams on a budget.',119000,131000,'LN-LT-E16',11,'laptops','lenovo',ARRAY['Ryzen 7','16GB RAM','512GB SSD','16 inch WUXGA'],'{"CPU":"AMD Ryzen 7","RAM":"16GB","Storage":"512GB SSD"}',4.4,16,NULL,false)
) AS v(name, slug, short_desc, descr, price, compare_price, sku, stock, cat, brand, features, specs, rating, review_count, tag, featured);

INSERT INTO public.coupons (code, discount_type, discount_value, min_order_total, max_uses, expires_at) VALUES
  ('WELCOME10','percent',10,10000,500,now() + interval '180 days'),
  ('JOYDESK5K','fixed',5000,60000,200,now() + interval '90 days'),
  ('FREESHIP','fixed',500,15000,1000,now() + interval '365 days');