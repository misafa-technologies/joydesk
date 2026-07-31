CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_enabled boolean NOT NULL DEFAULT false,
  email_provider text NOT NULL DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT false,
  smtp_user text,
  smtp_password text,
  resend_api_key text,
  from_name text DEFAULT 'JoyDesk',
  from_email text,
  admin_notify_email text,
  sms_enabled boolean NOT NULL DEFAULT false,
  at_username text,
  at_api_key text,
  at_sender_id text,
  at_sandbox boolean NOT NULL DEFAULT true,
  notify_order_confirmation boolean NOT NULL DEFAULT true,
  notify_payment_received boolean NOT NULL DEFAULT true,
  notify_shipping_update boolean NOT NULL DEFAULT true,
  notify_admin_new_order boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration settings admin only" ON public.integration_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_integration_settings_updated_at BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email',
  template text,
  recipient text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification logs staff read" ON public.notification_logs FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

CREATE POLICY "user roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

INSERT INTO public.integration_settings (id) SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.integration_settings);