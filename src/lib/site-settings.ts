import { siteConfig } from "@/lib/site-config";

export const DEFAULT_MAP_URL =
  "https://www.openstreetmap.org/export/embed.html?bbox=69.20%2C41.28%2C69.30%2C41.32&layer=mapnik";

export type SiteSettingsRow = {
  id: number;
  organization_name: string;
  organization_short_name: string | null;
  organization_type: string | null;
  director_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  working_hours: string | null;
  telegram_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  map_url: string | null;
  map_directions_url: string | null;
  created_at: string;
  updated_at: string;
};

export const SITE_SETTINGS_SELECT =
  "id, organization_name, organization_short_name, organization_type, director_name, phone, email, address, working_hours, telegram_url, instagram_url, facebook_url, youtube_url, map_url, map_directions_url, created_at, updated_at";

export type SiteSettings = {
  organizationName: string;
  organizationShortName: string;
  organizationType: string;
  directorName: string;
  phone: string;
  email: string;
  address: string;
  workingHours: string;
  telegramUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  mapEmbedUrl: string;
  mapDirectionsUrl: string;
};

export const fallbackSiteSettings: SiteSettings = {
  organizationName: siteConfig.schoolName,
  organizationShortName: siteConfig.shortName,
  organizationType: "umumiy o'rta ta'lim maktabi",
  directorName: siteConfig.principal.fullName,
  phone: siteConfig.phone,
  email: siteConfig.email,
  address: siteConfig.address,
  workingHours: siteConfig.workingHours,
  telegramUrl: siteConfig.socials.telegram,
  instagramUrl: siteConfig.socials.instagram,
  facebookUrl: siteConfig.socials.facebook,
  youtubeUrl: siteConfig.socials.youtube,
  mapEmbedUrl: DEFAULT_MAP_URL,
  mapDirectionsUrl: "",
};

function pickText(value: string | null | undefined, fallback: string) {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

export function mapSiteSettings(row: SiteSettingsRow | null | undefined): SiteSettings {
  if (!row) {
    return fallbackSiteSettings;
  }

  return {
    organizationName: pickText(row.organization_name, fallbackSiteSettings.organizationName),
    organizationShortName: pickText(row.organization_short_name, fallbackSiteSettings.organizationShortName),
    organizationType: pickText(row.organization_type, fallbackSiteSettings.organizationType),
    directorName: pickText(row.director_name, fallbackSiteSettings.directorName),
    phone: pickText(row.phone, fallbackSiteSettings.phone),
    email: pickText(row.email, fallbackSiteSettings.email),
    address: pickText(row.address, fallbackSiteSettings.address),
    workingHours: pickText(row.working_hours, fallbackSiteSettings.workingHours),
    telegramUrl: pickText(row.telegram_url, fallbackSiteSettings.telegramUrl),
    instagramUrl: pickText(row.instagram_url, fallbackSiteSettings.instagramUrl),
    facebookUrl: pickText(row.facebook_url, fallbackSiteSettings.facebookUrl),
    youtubeUrl: pickText(row.youtube_url, fallbackSiteSettings.youtubeUrl),
    mapEmbedUrl: pickText(row.map_url, fallbackSiteSettings.mapEmbedUrl),
    mapDirectionsUrl: (row.map_directions_url ?? "").trim(),
  };
}
