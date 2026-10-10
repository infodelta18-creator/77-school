export type LeadershipRow = {
  id: string;
  full_name: string;
  position: string;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  reception_days: string | null;
  biography: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const LEADERSHIP_SELECT =
  "id, full_name, position, photo_url, phone, email, reception_days, biography, sort_order, is_active, created_at, updated_at";

export function leadershipInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getLeadershipImageObjectPath(url: string | null | undefined) {
  const raw = (url ?? "").trim();
  if (!raw) {
    return null;
  }

  const marker = "/storage/v1/object/public/news-images/";
  const index = raw.indexOf(marker);
  if (index === -1) {
    return null;
  }

  const path = raw.slice(index + marker.length).split("?")[0].trim();
  if (!path || !path.startsWith("leadership/")) {
    return null;
  }

  return decodeURIComponent(path);
}
