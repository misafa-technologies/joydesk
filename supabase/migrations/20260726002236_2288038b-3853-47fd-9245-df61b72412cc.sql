ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS mpesa_paybill text,
  ADD COLUMN IF NOT EXISTS mpesa_account_name text;

INSERT INTO public.store_settings (store_name, tagline, support_email, support_phone, whatsapp_number, mpesa_paybill, mpesa_account_name)
SELECT 'JoyDesk', 'Comfort Meets Productivity', 'support@joydesk.co.ke', '+254700000000', '254700000000', '400200', 'JoyDesk'
WHERE NOT EXISTS (SELECT 1 FROM public.store_settings);

UPDATE public.store_settings
SET mpesa_paybill = COALESCE(mpesa_paybill, '400200'),
    mpesa_account_name = COALESCE(mpesa_account_name, 'JoyDesk'),
    whatsapp_number = COALESCE(whatsapp_number, '254700000000');