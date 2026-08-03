REVOKE SELECT ON public.couriers FROM anon;
GRANT SELECT (id, name, website, tracking_url_template, counties, is_active, created_at, updated_at) ON public.couriers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.couriers TO authenticated;
GRANT ALL ON public.couriers TO service_role;