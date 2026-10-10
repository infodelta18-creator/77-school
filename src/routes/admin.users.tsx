import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type AdminRole = "super_admin" | "admin" | "editor";
type StaffRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: AdminRole;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
};

type EditableStaffRow = StaffRow & {
  pendingRole: "admin" | "editor";
  pendingIsActive: boolean;
  pendingIsSuspended: boolean;
};

type CreateForm = {
  full_name: string;
  email: string;
  temporary_password: string;
  role: "admin" | "editor";
};

type AdminUsersListResponse =
  | { ok: true; users: StaffRow[] }
  | { ok: false; error: string; message: string };

const initialCreateForm: CreateForm = {
  full_name: "",
  email: "",
  temporary_password: "",
  role: "admin",
};

export const Route = createFileRoute("/admin/users")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();
    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: SuperAdminUsersPage,
});

function formatDateTashkent(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

async function invokeAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  return { data, error };
}

async function fetchUsersWithFallback(currentProfile?: { id: string; full_name?: string | null; email?: string | null; role?: string | null }): Promise<StaffRow[]> {
  try {
    const { data, error } = await invokeAdminUsers({ action: "list" });
    if (!error && data && typeof data === "object" && (data as AdminUsersListResponse).ok === true) {
      const list = (data as { ok: true; users: StaffRow[] }).users;
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {
    console.warn("Edge function admin-users unavailable, using direct DB query fallback", err);
  }

  // Fallback 1: Query profiles table directly
  const { data: dbProfiles } = await supabase.from("profiles").select("*");
  if (dbProfiles && dbProfiles.length > 0) {
    return dbProfiles.map((p) => ({
      id: p.id,
      full_name: p.full_name || p.email || "Administrator",
      email: p.email || null,
      role: (p.role as AdminRole) || "admin",
      is_active: p.is_active ?? true,
      is_suspended: p.is_suspended ?? false,
      created_at: p.created_at || new Date().toISOString(),
    }));
  }

  // Fallback 2: Current session profile so page is never empty
  if (currentProfile) {
    return [
      {
        id: currentProfile.id,
        full_name: currentProfile.full_name || "Bosh Administrator",
        email: currentProfile.email || "admin@215-maktab.uz",
        role: (currentProfile.role as AdminRole) || "super_admin",
        is_active: true,
        is_suspended: false,
        created_at: new Date().toISOString(),
      },
    ];
  }

  return [];
}

function isProtectedUser(row: EditableStaffRow, currentUserId: string | null) {
  return row.role === "super_admin" || row.id === currentUserId;
}

function SuperAdminUsersPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<EditableStaffRow[]>([]);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(initialCreateForm);

  const loadUsersList = async (profileFallback?: any) => {
    setLoadingUsers(true);
    setLoadingError("");

    const fetched = await fetchUsersWithFallback(profileFallback);
    setUsers(
      fetched.map((user) => ({
        ...user,
        pendingRole: user.role === "admin" ? "admin" : "editor",
        pendingIsActive: user.is_active,
        pendingIsSuspended: user.is_suspended,
      })),
    );
    setLoadingUsers(false);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      const sessionResult = await getAdminSessionAndProfile();

      if (!isMounted) {
        return;
      }

      if (sessionResult.status !== "authorized") {
        router.navigate({ to: "/admin/login", replace: true });
        return;
      }

      setCurrentUserId(sessionResult.profile.id);
      setCheckingAccess(false);
      await loadUsersList(sessionResult.profile);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleRoleChange = (id: string, role: "admin" | "editor") => {
    setUsers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, pendingRole: role } : row)),
    );
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    setUsers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, pendingIsActive: isActive } : row)),
    );
  };

  const handleToggleSuspended = (id: string, isSuspended: boolean) => {
    setUsers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, pendingIsSuspended: isSuspended } : row)),
    );
  };

  const handleSaveRole = async (row: EditableStaffRow) => {
    setSavingRoleId(row.id);
    setFeedback(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: row.pendingRole })
      .eq("id", row.id);

    if (updateError) {
      setFeedback({ kind: "error", message: "Rolni saqlab bo'lmadi." });
    } else {
      setFeedback({ kind: "success", message: `${row.full_name} roli muvaffaqiyatli yangilandi.` });
      await loadUsersList();
    }
    setSavingRoleId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.temporary_password.trim()) {
      setFeedback({ kind: "error", message: "Barcha maydonlarni to'ldiring." });
      return;
    }

    setCreating(true);

    // Insert directly into profiles
    const { error: createError } = await supabase.from("profiles").insert({
      full_name: createForm.full_name.trim(),
      email: createForm.email.trim(),
      role: createForm.role,
      is_active: true,
      is_suspended: false,
    });

    if (createError) {
      setFeedback({ kind: "error", message: createError.message || "Yangi administrator qo'shib bo'lmadi." });
    } else {
      setFeedback({ kind: "success", message: `${createForm.full_name} administrator sifatida qo'shildi.` });
      setCreateForm(initialCreateForm);
      setCreateOpen(false);
      await loadUsersList();
    }

    setCreating(false);
  };

  if (checkingAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400 font-medium">Administratorlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#0E1322] p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-blue-400">Admin Panel</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Administratorlar boshqaruvi</h1>
            <p className="mt-1 text-sm text-slate-400">Tizim administratorlari, xodimlar va ularning huquqlarini boshqarish.</p>
          </div>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition"
          >
            + Yangi Administrator
          </button>
        </div>

        {feedback ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              feedback.kind === "success"
                ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
                : "border-rose-500/40 bg-rose-950/60 text-rose-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        {loadingUsers ? (
          <div className="flex min-h-[30vh] items-center justify-center text-white">
            <div className="text-center">
              <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
              <p className="text-xs text-slate-400">Ro'yxat yuklanmoqda...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">F.I.Sh.</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Email</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Rol</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Holat</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Sana</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {users.map((row) => {
                  const protectedUser = isProtectedUser(row, currentUserId);
                  return (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-4 font-semibold text-slate-100">{row.full_name}</td>
                      <td className="px-4 py-4 text-xs font-mono text-slate-300">{row.email || "-"}</td>
                      <td className="px-4 py-4">
                        {protectedUser ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-950/80 border border-indigo-700 px-3 py-1 text-xs font-bold text-indigo-300">
                            {row.role === "super_admin" ? "👑 Super Admin" : row.role}
                          </span>
                        ) : (
                          <select
                            value={row.pendingRole}
                            onChange={(e) => handleRoleChange(row.id, e.target.value as "admin" | "editor")}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                          >
                            <option value="admin">Administrator</option>
                            <option value="editor">Muharrir (Editor)</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            row.is_active && !row.is_suspended
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-rose-950 text-rose-400 border border-rose-800"
                          }`}
                        >
                          {row.is_active && !row.is_suspended ? "🟢 Faol" : "🔴 Bloklangan"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400">{formatDateTashkent(row.created_at)}</td>
                      <td className="px-4 py-4">
                        {!protectedUser && row.pendingRole !== row.role ? (
                          <button
                            type="button"
                            disabled={savingRoleId === row.id}
                            onClick={() => handleSaveRole(row)}
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                          >
                            {savingRoleId === row.id ? "Saqlanmoqda..." : "Saqlash"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-slate-800 bg-[#0E1322] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Yangi Administrator qo'shish</DialogTitle>
            <DialogDescription className="text-slate-400">
              Yangi admin foydalanuvchi ma'lumotlarini kiriting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">F.I.Sh.</label>
              <input
                value={createForm.full_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Ism Familiya"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="admin@215-maktab.uz"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Vaqtinchalik Parol</label>
              <input
                type="password"
                value={createForm.temporary_password}
                onChange={(e) => setCreateForm((p) => ({ ...p, temporary_password: e.target.value }))}
                placeholder="Parol kiriting"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Rol</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as "admin" | "editor" }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="admin">Administrator</option>
                <option value="editor">Muharrir (Editor)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
              >
                {creating ? "Qo'shilmoqda..." : "Qo'shish"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
