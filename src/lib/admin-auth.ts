import { supabase } from "./supabase";

export type StaffProfile = {
  id: string;
  full_name: string;
  role: string;
  is_active?: boolean | null;
  is_suspended?: boolean | null;
};

const AUTHORIZED_ROLES = new Set(["super_admin", "admin", "editor"]);

export async function getAdminSessionAndProfile() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Supabase session error:", sessionError.message);
    return {
      status: "error" as const,
      session: null,
      profile: null,
      message: "Kirishda muammo yuz berdi. Iltimos, keyinroq urinib ko‘ring.",
    };
  }

  if (!session?.user) {
    return { status: "unauthenticated" as const, session: null, profile: null, message: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, is_suspended")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Supabase profile lookup error:", error.message);
    return {
      status: "error" as const,
      session,
      profile: null,
      message: "Kirishda muammo yuz berdi. Iltimos, keyinroq urinib ko‘ring.",
    };
  }

  const profile = data as StaffProfile | null;
  const isActive = profile?.is_active !== false;
  const isNotSuspended = profile?.is_suspended !== true;
  const hasAllowedRole = Boolean(profile?.role && AUTHORIZED_ROLES.has(profile.role));

  if (!profile || !hasAllowedRole || !isActive || !isNotSuspended) {
    await supabase.auth.signOut();
    return {
      status: "unauthorized" as const,
      session: null,
      profile: null,
      message: "Kirish uchun ruxsat yo‘q yoki hisob faol emas. Iltimos, administrator bilan bog‘laning.",
    };
  }

  return { status: "authorized" as const, session, profile, message: null };
}

export async function signInAdmin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Supabase sign-in error:", error.message);
    return {
      status: "error" as const,
      message: "Email yoki parol noto‘g‘ri. Iltimos, ma’lumotlarni tekshiring.",
    };
  }

  const profileCheck = await getAdminSessionAndProfile();

  if (profileCheck.status === "unauthenticated") {
    return {
      status: "error" as const,
      message: "Kirish uchun ruxsat yo‘q yoki hisob faol emas.",
    };
  }

  if (profileCheck.status !== "authorized") {
    return {
      status: "error" as const,
      message: profileCheck.message ?? "Kirish uchun ruxsat yo‘q yoki hisob faol emas.",
    };
  }

  return { status: "ok" as const, message: null };
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}
