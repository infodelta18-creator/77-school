import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  SITE_SETTINGS_SELECT,
  mapSiteSettings,
  fallbackSiteSettings,
  type SiteSettingsRow,
} from "@/lib/site-settings";

export const siteSettingsQueryKey = ["site_settings", "singleton"] as const;

export function useSiteSettings() {
  const query = useQuery({
    queryKey: siteSettingsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select(SITE_SETTINGS_SELECT)
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return mapSiteSettings((data ?? null) as SiteSettingsRow | null);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    settings: query.data ?? fallbackSiteSettings,
  };
}
