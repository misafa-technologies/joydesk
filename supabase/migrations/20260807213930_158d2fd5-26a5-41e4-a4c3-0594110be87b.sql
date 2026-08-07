ALTER TABLE public.auth_settings
  ADD COLUMN IF NOT EXISTS google_client_id text;

ALTER TABLE public.integration_settings
  ADD COLUMN IF NOT EXISTS custom_password_reset boolean NOT NULL DEFAULT false;