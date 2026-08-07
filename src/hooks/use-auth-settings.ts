import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AuthSettings = {
  id?: string;
  email_enabled: boolean;
  signup_enabled: boolean;
  google_enabled: boolean;
  apple_enabled: boolean;
  social_note: string | null;
  google_client_id: string | null;
};

const DEFAULTS: AuthSettings = {
  email_enabled: true,
  signup_enabled: true,
  google_enabled: false,
  apple_enabled: false,
  social_note: null,
  google_client_id: null,
};

export function useAuthSettings() {
  return useQuery({
    queryKey: ["auth-settings"],
    queryFn: async (): Promise<AuthSettings> => {
      const { data, error } = await supabase.from("auth_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        id: data.id,
        email_enabled: data.email_enabled,
        signup_enabled: data.signup_enabled,
        google_enabled: data.google_enabled,
        apple_enabled: data.apple_enabled,
        social_note: data.social_note,
        google_client_id: data.google_client_id,
      };
    },
    staleTime: 60_000,
  });
}
