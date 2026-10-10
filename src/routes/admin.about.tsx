import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, Image as ImageIcon } from "lucide-react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import {
  ABOUT_SCHOOL_SELECT,
  DEFAULT_DYNAMIC_STATS,
  type AboutSchoolRow,
  type AboutSchoolStatRow,
} from "@/lib/about-school";

type AboutForm = {
  title_uz: string;
  intro_uz: string;
  history_label_uz: string;
  history_title_uz: string;
  history_text_uz: string;
  main_image_url: string;
  secondary_image_url: string;
};

const initialForm: AboutForm = {
  title_uz: "Maktab haqida",
  intro_uz: "",
  history_label_uz: "TARIX",
  history_title_uz: "Maktab tarixi",
  history_text_uz: "",
  main_image_url: "",
  secondary_image_url: "",
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const Route = createFileRoute("/admin/about")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminAboutPage,
});

function toNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function AdminAboutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentAdminName, setCurrentAdminName] = useState<string>("Admin");

  const [form, setForm] = useState<AboutForm>(initialForm);
  const [stats, setStats] = useState<AboutSchoolStatRow[]>(DEFAULT_DYNAMIC_STATS);
  const [isDirty, setIsDirty] = useState(false);

  // File Upload states
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [secondaryFile, setSecondaryFile] = useState<File | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const auth = await getAdminSessionAndProfile();

      if (!mounted) return;

      if (auth.status !== "authorized") {
        router.navigate({ to: "/admin/login", replace: true });
        return;
      }

      setCurrentAdminName(auth.profile.full_name || "Admin");

      const [aboutRes, statsRes] = await Promise.all([
        supabase.from("about_school").select(ABOUT_SCHOOL_SELECT).eq("id", 1).maybeSingle(),
        supabase.from("about_school_stats").select("*").order("sort_order", { ascending: true }),
      ]);

      if (!mounted) return;

      if (aboutRes.data) {
        const row = aboutRes.data as AboutSchoolRow;
        setForm({
          title_uz: row.title_uz ?? "Maktab haqida",
          intro_uz: row.intro_uz ?? "",
          history_label_uz: row.history_label_uz ?? "TARIX",
          history_title_uz: row.history_title_uz ?? "Maktab tarixi",
          history_text_uz: row.history_text_uz ?? "",
          main_image_url: row.main_image_url ?? "",
          secondary_image_url: row.secondary_image_url ?? "",
        });
      }

      if (statsRes.data && Array.isArray(statsRes.data) && statsRes.data.length > 0) {
        setStats(statsRes.data as AboutSchoolStatRow[]);
      } else if (aboutRes.data) {
        const row = aboutRes.data as AboutSchoolRow;
        setStats([
          { id: "stat-1", about_id: 1, icon: "calendar", value: String(row.founded_year ?? 1981), label: "Tashkil etilgan yil", sort_order: 1, is_active: true },
          { id: "stat-2", about_id: 1, icon: "building", value: String(row.students_count ?? 880), label: "O‘quvchilar o‘rni", sort_order: 2, is_active: true },
          { id: "stat-3", about_id: 1, icon: "user-check", value: String(row.teachers_count ?? 41), label: "O‘qituvchilar soni", sort_order: 3, is_active: true },
          { id: "stat-4", about_id: 1, icon: "door-open", value: String(row.classrooms_count ?? 25), label: "Sinflar soni", sort_order: 4, is_active: true },
        ]);
      }

      setLoading(false);
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleFormChange = (key: keyof AboutForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setError("Faqat JPG, PNG, WEBP yoki GIF rasmlar yuklanishi mumkin.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Rasm hajmi 5MB dan oshmasligi kerak.");
      return;
    }

    setMainFile(file);
    setIsDirty(true);
    setError("");
  };

  const handleSecondaryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setError("Faqat JPG, PNG, WEBP yoki GIF rasmlar yuklanishi mumkin.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Rasm hajmi 5MB dan oshmasligi kerak.");
      return;
    }

    setSecondaryFile(file);
    setIsDirty(true);
    setError("");
  };

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    const ext = ALLOWED_IMAGE_TYPES[file.type] || "jpg";
    const objectPath = `about/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("news-images")
      .upload(objectPath, file, { cacheControl: "3600", upsert: false });

    if (uploadErr) {
      console.error("Storage upload failed:", uploadErr);
      return null;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(objectPath);
    return data.publicUrl;
  };

  // Dynamic Stats Management
  const handleAddStat = () => {
    const newStat: AboutSchoolStatRow = {
      id: `temp-${Date.now()}`,
      about_id: 1,
      icon: "award",
      value: "100",
      label: "Yangi ko'rsatkich",
      sort_order: stats.length + 1,
      is_active: true,
    };
    setStats([...stats, newStat]);
    setIsDirty(true);
  };

  const handleUpdateStat = (id: string, key: keyof AboutSchoolStatRow, val: any) => {
    setStats(stats.map((s) => (s.id === id ? { ...s, [key]: val } : s)));
    setIsDirty(true);
  };

  const handleDeleteStat = (id: string) => {
    setStats(stats.filter((s) => s.id !== id));
    setIsDirty(true);
  };

  const handleMoveStat = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stats.length) return;

    const newStats = [...stats];
    const temp = newStats[index]!;
    newStats[index] = newStats[targetIndex]!;
    newStats[targetIndex] = temp;

    // re-assign sort_order
    const updated = newStats.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    setStats(updated);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    let finalMainUrl = form.main_image_url.trim();
    let finalSecondaryUrl = form.secondary_image_url.trim();

    if (mainFile) {
      const uploaded = await uploadFileToStorage(mainFile);
      if (uploaded) finalMainUrl = uploaded;
    }
    if (secondaryFile) {
      const uploaded = await uploadFileToStorage(secondaryFile);
      if (uploaded) finalSecondaryUrl = uploaded;
    }

    // Parse counts for passport columns sync
    let founded_year = 1981;
    let students_count = 880;
    let teachers_count = 41;
    let classrooms_count = 25;

    stats.forEach((s, i) => {
      const val = Number.parseInt(s.value.replace(/\D/g, ""), 10);
      if (Number.isFinite(val) && val > 0) {
        const lbl = s.label.toLowerCase();
        if (lbl.includes("tashkil") || lbl.includes("yil") || i === 0) founded_year = val;
        else if (lbl.includes("o'quvchi") || lbl.includes("o‘quvchi") || lbl.includes("o'rni") || i === 1) students_count = val;
        else if (lbl.includes("o'qituvchi") || lbl.includes("o‘qituvchi") || lbl.includes("pedagog") || i === 2) teachers_count = val;
        else if (lbl.includes("sinf") || i === 3) classrooms_count = val;
      }
    });

    // 1. Update about_school table
    const payload = {
      title_uz: toNullableText(form.title_uz),
      intro_uz: toNullableText(form.intro_uz),
      history_title_uz: toNullableText(form.history_title_uz),
      history_text_uz: toNullableText(form.history_text_uz),
      main_image_url: toNullableText(finalMainUrl),
      secondary_image_url: toNullableText(finalSecondaryUrl),
      founded_year,
      students_count,
      teachers_count,
      classrooms_count,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase.from("about_school").upsert({ id: 1, ...payload });

    if (upsertErr) {
      console.error("About update error:", upsertErr);
      setError(upsertErr.message || "Ma'lumotlarni saqlab bo'lmadi.");
      setSaving(false);
      return;
    }

    // 2. Sync dynamic stats table
    try {
      const { error: delErr } = await supabase.from("about_school_stats").delete().eq("about_id", 1);
      if (delErr) console.warn("Delete stats warning:", delErr.message);

      if (stats.length > 0) {
        const statsPayload = stats.map((s, idx) => ({
          about_id: 1,
          icon: s.icon || "award",
          value: s.value.trim() || "0",
          label: s.label.trim() || "Statistika",
          sort_order: idx + 1,
          is_active: s.is_active,
          updated_by: currentAdminName,
        }));

        const { error: insErr } = await supabase.from("about_school_stats").insert(statsPayload);
        if (insErr) console.warn("Insert stats warning:", insErr.message);
      }
    } catch (statErr) {
      console.warn("Stats sync warning:", statErr);
    }

    setForm((p) => ({
      ...p,
      main_image_url: finalMainUrl,
      secondary_image_url: finalSecondaryUrl,
    }));
    setMainFile(null);
    setSecondaryFile(null);
    setIsDirty(false);
    setSuccess("Maktab tarixi va statistikalar muvaffaqiyatli saqlandi!");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#0E1322] p-8 shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-blue-400">Admin Panel</p>
            <h1 className="mt-1 text-3xl font-bold text-white">"Maktab tarixi" Boshqaruvi</h1>
            <p className="mt-1 text-sm text-slate-400">
              Maktab tarixi matni, dinamik statistik kartalar va rasmlarni tahrirlash.
            </p>
          </div>
          {isDirty && (
            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-semibold text-amber-400">
              ⚠️ Saqlanmagan o'zgarishlar mavjud
            </span>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION A: MAIN HISTORY TEXT */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <h2 className="text-base font-bold text-blue-400 uppercase tracking-wider">A) Asosiy Ma'lumot va Tarix</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bo'lim tegi (Label)</label>
                <input
                  value={form.history_label_uz}
                  onChange={(e) => handleFormChange("history_label_uz", e.target.value)}
                  placeholder="TARIX"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Sarlavha</label>
                <input
                  value={form.history_title_uz}
                  onChange={(e) => handleFormChange("history_title_uz", e.target.value)}
                  placeholder="Maktab tarixi"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Asosiy matn (Maktab tarixi haqida to'liq tavsif)</label>
              <textarea
                value={form.history_text_uz}
                onChange={(e) => handleFormChange("history_text_uz", e.target.value)}
                rows={6}
                placeholder="215-sonli umumiy o'rta ta'lim maktabi Toshkent shahri Yashnobod tumanida..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm leading-relaxed text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION B: DYNAMIC STATISTICS MANAGER */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-amber-400 uppercase tracking-wider">B) Statistik Kartalar (Dinamik)</h2>
              <button
                type="button"
                onClick={handleAddStat}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition"
              >
                <Plus className="h-4 w-4" />
                Statistika qo'shish
              </button>
            </div>

            <div className="space-y-3">
              {stats.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStat(idx, "up")}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === stats.length - 1}
                      onClick={() => handleMoveStat(idx, "down")}
                      className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-28 sm:w-36">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Qiymat (Value)</label>
                    <input
                      value={s.value}
                      onChange={(e) => handleUpdateStat(s.id, "value", e.target.value)}
                      placeholder="1981"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">Izoh (Label)</label>
                    <input
                      value={s.label}
                      onChange={(e) => handleUpdateStat(s.id, "label", e.target.value)}
                      placeholder="Tashkil etilgan yil"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                      <input
                        type="checkbox"
                        checked={s.is_active}
                        onChange={(e) => handleUpdateStat(s.id, "is_active", e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                      Faol
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteStat(s.id)}
                      className="rounded-lg p-2 text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION C: IMAGES UPLOADER */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 space-y-4">
            <h2 className="text-base font-bold text-blue-400 uppercase tracking-wider">C) Rasmlar Boshqaruvi</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Image 1 */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-bold uppercase text-slate-300">Rasm 1 (Chap tomondagi asosiy rasm)</p>
                {form.main_image_url ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                    <img src={form.main_image_url} alt="Preview 1" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleFormChange("main_image_url", "")}
                      className="absolute top-2 right-2 rounded-lg bg-rose-600 p-1.5 text-white hover:bg-rose-500 shadow-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950 text-slate-500">
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <span className="text-xs">Rasm mavjud emas</span>
                  </div>
                )}
                <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 cursor-pointer hover:bg-slate-700 transition">
                  <Upload className="h-4 w-4" />
                  {mainFile ? mainFile.name : "Rasm 1 ni almashtirish"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleMainFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Image 2 */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-bold uppercase text-slate-300">Rasm 2 (Ikkinchi rasm)</p>
                {form.secondary_image_url ? (
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                    <img src={form.secondary_image_url} alt="Preview 2" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleFormChange("secondary_image_url", "")}
                      className="absolute top-2 right-2 rounded-lg bg-rose-600 p-1.5 text-white hover:bg-rose-500 shadow-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950 text-slate-500">
                    <ImageIcon className="h-8 w-8 mb-1" />
                    <span className="text-xs">Rasm mavjud emas</span>
                  </div>
                )}
                <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 cursor-pointer hover:bg-slate-700 transition">
                  <Upload className="h-4 w-4" />
                  {secondaryFile ? secondaryFile.name : "Rasm 2 ni almashtirish"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleSecondaryFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
