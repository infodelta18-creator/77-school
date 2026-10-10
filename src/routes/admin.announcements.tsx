import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type AnnouncementStatus = "draft" | "published" | "archived";
type AnnouncementImportance = "normal" | "important" | "critical";

type AnnouncementRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  importance: AnnouncementImportance;
  start_date: string | null;
  expiration_date: string | null;
  status: AnnouncementStatus;
  created_at: string;
};

type AnnouncementForm = {
  id: string | null;
  title: string;
  slug: string;
  content: string;
  importance: AnnouncementImportance;
  start_date: string;
  expiration_date: string;
  status: AnnouncementStatus;
};

const initialForm: AnnouncementForm = {
  id: null,
  title: "",
  slug: "",
  content: "",
  importance: "normal",
  start_date: "",
  expiration_date: "",
  status: "draft",
};

export const Route = createFileRoute("/admin/announcements")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminAnnouncementsPage,
});

function slugifyUzbek(input: string) {
  let normalized = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ʻʼ’‘`´]/g, "'")
    .replace(/o'/g, "o")
    .replace(/g'/g, "g")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    normalized = "elon";
  }

  return normalized;
}

async function generateUniqueSlug(baseInput: string, excludeId?: string) {
  const base = slugifyUzbek(baseInput);
  const { data, error } = await supabase
    .from("announcements")
    .select("id, slug")
    .ilike("slug", `${base}%`);

  if (error) {
    return base;
  }

  const used = new Set((data ?? []).filter((row) => row.id !== excludeId).map((row) => row.slug));
  if (!used.has(base)) {
    return base;
  }

  let i = 2;
  while (used.has(`${base}-${i}`)) {
    i += 1;
  }

  return `${base}-${i}`;
}

function toDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatDateDDMMYYYY(value: string | null) {
  if (!value) {
    return "-";
  }

  const [datePart] = value.split("T");
  const [year = "", month = "", day = ""] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

function AdminAnnouncementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [form, setForm] = useState<AnnouncementForm>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAnnouncements = async () => {
    const { data, error: fetchError } = await supabase
      .from("announcements")
      .select("id, title, slug, content, importance, start_date, expiration_date, status, created_at")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("E'lonlarni yuklab bo'lmadi.");
      return;
    }

    setAnnouncements((data ?? []) as AnnouncementRow[]);
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      const auth = await getAdminSessionAndProfile();

      if (!mounted) {
        return;
      }

      if (auth.status !== "authorized") {
        router.navigate({ to: "/admin/login", replace: true });
        return;
      }

      setCurrentUserId(auth.profile.id);
      await loadAnnouncements();
      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  const startEdit = (item: AnnouncementRow) => {
    setForm({
      id: item.id,
      title: item.title,
      slug: item.slug,
      content: item.content,
      importance: item.importance,
      start_date: toDatetimeLocal(item.start_date),
      expiration_date: toDatetimeLocal(item.expiration_date),
      status: item.status,
    });
    setError("");
    setSuccess("");
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const saveAnnouncement = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Sarlavha va matn majburiy.");
      return;
    }

    const startDateIso = fromDatetimeLocal(form.start_date);
    const expirationDateIso = fromDatetimeLocal(form.expiration_date);

    if (startDateIso && expirationDateIso && expirationDateIso < startDateIso) {
      setError("Tugash sanasi boshlanish sanasidan oldin bo'lmasligi kerak.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const generatedSlug = await generateUniqueSlug(form.slug.trim() || form.title.trim(), form.id ?? undefined);

    const payload = {
      title: form.title.trim(),
      slug: generatedSlug,
      content: form.content.trim(),
      importance: form.importance,
      start_date: startDateIso,
      expiration_date: expirationDateIso,
      status: form.status,
      ...(form.id ? {} : { created_by: currentUserId }),
    };

    if (form.id) {
      const { error: updateError } = await supabase.from("announcements").update(payload).eq("id", form.id);
      if (updateError) {
        console.error("announcements:update failed", updateError);
        setError("E'lonni saqlab bo'lmadi.");
        setSaving(false);
        return;
      }
      setSuccess("E'lon yangilandi.");
    } else {
      const { error: insertError } = await supabase.from("announcements").insert(payload);
      if (insertError) {
        console.error("announcements:insert failed", insertError);
        setError("E'lon yaratib bo'lmadi.");
        setSaving(false);
        return;
      }
      setSuccess("E'lon yaratildi.");
    }

    await loadAnnouncements();
    resetForm();
    setSaving(false);
  };

  const deleteAnnouncement = async (item: AnnouncementRow) => {
    const confirmed = window.confirm(`"${item.title}" e'lonini o'chirmoqchimisiz?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("announcements").delete().eq("id", item.id);
    if (deleteError) {
      console.error("announcements:delete failed", deleteError);
      setError("E'lonni o'chirib bo'lmadi.");
      setDeletingId(null);
      return;
    }

    setSuccess("E'lon o'chirildi.");
    await loadAnnouncements();
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          <p className="text-sm text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl rounded-xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">E'lonlar boshqaruvi</h1>
          <p className="mt-2 text-sm text-slate-400">E'lonlarni yaratish, tahrirlash va o'chirish.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold">{form.id ? "E'lonni tahrirlash" : "Yangi e'lon"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title: nextTitle,
                    slug: prev.id ? prev.slug : slugifyUzbek(nextTitle),
                  }));
                }}
                placeholder="Sarlavha"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: slugifyUzbek(event.target.value) }))}
                placeholder="slug"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="E'lon matni"
                className="min-h-36 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <select
                value={form.importance}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, importance: event.target.value as AnnouncementImportance }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="normal">normal</option>
                <option value="important">important</option>
                <option value="critical">critical</option>
              </select>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as AnnouncementStatus }))
                }
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={form.expiration_date}
                onChange={(event) => setForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveAnnouncement}
                  disabled={saving}
                  className="rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
                >
                  {saving ? "Saqlanmoqda..." : form.id ? "Yangilash" : "Yaratish"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium"
                >
                  Tozalash
                </button>
              </div>
            </div>
            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
            {success ? <p className="mt-4 text-sm text-emerald-400">{success}</p> : null}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold">Mavjud e'lonlar</h2>
            <div className="mt-4 space-y-3">
              {announcements.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  Hozircha e'lonlar yo'q.
                </div>
              ) : (
                announcements.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-slate-700 px-2 py-0.5">{item.status}</span>
                      <span className="rounded bg-slate-700 px-2 py-0.5">{item.importance}</span>
                      <span className="text-slate-400">{formatDateDDMMYYYY(item.start_date ?? item.created_at)}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-300">{item.content}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium"
                      >
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(item)}
                        disabled={deletingId === item.id}
                        className="rounded-md border border-red-700 bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-200 disabled:opacity-60"
                      >
                        {deletingId === item.id ? "O'chirilmoqda..." : "O'chirish"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
