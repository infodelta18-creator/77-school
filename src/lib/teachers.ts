export type TeacherRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  subject: string | null;
  department: string | null;
  experience_years: number | null;
  qualification: string | null;
  biography: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const TEACHERS_SELECT =
  "id, full_name, photo_url, subject, department, experience_years, qualification, biography, sort_order, is_featured, is_active, created_at, updated_at";

export function teacherInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function getNewsImageObjectPath(url: string | null | undefined) {
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
  if (!path || !path.startsWith("teachers/")) {
    return null;
  }

  return decodeURIComponent(path);
}
