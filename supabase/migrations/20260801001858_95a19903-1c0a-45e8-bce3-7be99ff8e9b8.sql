ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.addresses
    SET is_default = false, updated_at = now()
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = true;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.addresses
    WHERE user_id = NEW.user_id AND id <> NEW.id
  ) THEN
    NEW.is_default := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON public.addresses;
CREATE TRIGGER ensure_single_default_address_trigger
BEFORE INSERT OR UPDATE OF is_default ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_address();

CREATE OR REPLACE FUNCTION public.promote_default_address_after_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_default THEN
    UPDATE public.addresses
    SET is_default = true, updated_at = now()
    WHERE id = (
      SELECT id FROM public.addresses
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS promote_default_address_after_delete_trigger ON public.addresses;
CREATE TRIGGER promote_default_address_after_delete_trigger
AFTER DELETE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.promote_default_address_after_delete();

CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user
ON public.addresses (user_id)
WHERE is_default = true;