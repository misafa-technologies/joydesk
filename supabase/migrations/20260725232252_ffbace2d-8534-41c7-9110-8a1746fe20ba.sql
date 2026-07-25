REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

DROP POLICY "products public read" ON public.products;
CREATE POLICY "products anon read active" ON public.products FOR SELECT TO anon USING (is_active);
CREATE POLICY "products auth read" ON public.products FOR SELECT TO authenticated USING (is_active OR public.is_staff(auth.uid()));

DROP POLICY "coupons public read active" ON public.coupons;
CREATE POLICY "coupons anon read active" ON public.coupons FOR SELECT TO anon USING (is_active);
CREATE POLICY "coupons auth read" ON public.coupons FOR SELECT TO authenticated USING (is_active OR public.is_staff(auth.uid()));

DROP POLICY "reviews public read" ON public.reviews;
CREATE POLICY "reviews anon read approved" ON public.reviews FOR SELECT TO anon USING (is_approved);
CREATE POLICY "reviews auth read" ON public.reviews FOR SELECT TO authenticated USING (is_approved OR auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY "categories public read" ON public.categories;
CREATE POLICY "categories read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY "brands public read" ON public.brands;
CREATE POLICY "brands read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
DROP POLICY "settings public read" ON public.store_settings;
CREATE POLICY "settings read" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);