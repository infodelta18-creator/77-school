import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { TEACHERS_SELECT, getNewsImageObjectPath, type TeacherRow } from "@/lib/teachers";

type TeacherForm = {
  id: string | null;
  full_name: string;
  subject: string;
  department: string;
  experience_years: string;
  qualification: string;
  biography: string;
  sort_order: string;
  is_featured: boolean;
  is_active: boolean;
  photo_url: string;
};

const initialForm: TeacherForm = {
  id: null,
  full_name: "",
  subject: "",
  department: "",
  experience_years: "",
  qualification: "",
  biography: "",
  sort_order: "0",
  is_featured: false,
  is_active: true,
  photo_url: "",
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const Route = createFileRoute("/admin/teachers")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminTeachersPage,
});

function toOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapTeacherToForm(teacher: TeacherRow): TeacherForm {
  return {
    id: teacher.id,
    full_name: teacher.full_name,
    subject: teacher.subject ?? "",
    department: teacher.department ?? "",
    experience_years: teacher.experience_years?.toString() ?? "",
    qualification: teacher.qualification ?? "",
    biography: teacher.biography ?? "",
    sort_order: teacher.sort_order.toString(),
    is_featured: teacher.is_featured,
    is_active: teacher.is_active,
    photo_url: teacher.photo_url ?? "",
  };
}

function AdminTeachersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [form, setForm] = useState<TeacherForm>(initialForm);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    [teachers],
  );

  const loadTeachers = async () => {
    const { data, error: fetchError } = await supabase
      .from("teachers")
      .select(TEACHERS_SELECT)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError("O'qituvchilarni yuklab bo'lmadi.");
      return;
    }

    setTeachers((data ?? []) as TeacherRow[]);
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

      await loadTeachers();
      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  const resetForm = () => {
    setForm(initialForm);
    setSelectedPhoto(null);
    setSelectedPhotoName("");
  };

  const startEdit = (teacher: TeacherRow) => {
    setForm(mapTeacherToForm(teacher));
    setSelectedPhoto(null);
    setSelectedPhotoName("");
    setError("");
    setSuccess("");
  };

  const onPhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");

    if (!file) {
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setError("Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.");
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Rasm hajmi 5MB dan oshmasligi kerak.");
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      return;
    }

    setSelectedPhoto(file);
    setSelectedPhotoName(file.name);
  };

  const uploadTeacherPhotoIfSelected = async () => {
    if (!selectedPhoto) {
      return null;
    }

    const extension = ALLOWED_IMAGE_TYPES[selectedPhoto.type];
    const objectPath = `teachers/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

    setUploadingPhoto(true);
    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(objectPath, selectedPhoto, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedPhoto.type,
      });

    if (uploadError) {
      setUploadingPhoto(false);
      setError("Rasmni yuklab bo'lmadi.");
      return null;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(objectPath);
    setUploadingPhoto(false);
    return {
      objectPath,
      publicUrl: data.publicUrl,
    };
  };

  const deleteTeacherPhotoPath = async (path: string | null) => {
    if (!path) {
      return;
    }

    await supabase.storage.from("news-images").remove([path]);
  };

  const saveTeacher = async () => {
    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    const fullName = form.full_name.trim();
    const subject = form.subject.trim();

    if (fullName.length < 2) {
      setError("F.I.Sh. kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (!subject) {
      setError("Fan nomi majburiy.");
      return;
    }

    const experienceYears = form.experience_years.trim();
    if (experienceYears && (!/^\d+$/.test(experienceYears) || Number(experienceYears) > 80)) {
      setError("Tajriba yillari noto'g'ri.");
      return;
    }

    const sortOrder = form.sort_order.trim();
    if (!/^[-]?\d+$/.test(sortOrder)) {
      setError("Tartib raqami butun son bo'lishi kerak.");
      return;
    }

    setSaving(true);

    const uploaded = await uploadTeacherPhotoIfSelected();
    if (selectedPhoto && !uploaded) {
      setSaving(false);
      return;
    }

    const currentPhotoPath = getNewsImageObjectPath(form.photo_url);

    const payload = {
      full_name: fullName,
      subject,
      department: toOptionalText(form.department),
      experience_years: experienceYears ? Number(experienceYears) : null,
      qualification: toOptionalText(form.qualification),
      biography: toOptionalText(form.biography),
      sort_order: Number(sortOrder),
      is_featured: form.is_featured,
      is_active: form.is_active,
      photo_url: uploaded?.publicUrl ?? toOptionalText(form.photo_url),
    };

    if (form.id) {
      const { error: updateError } = await supabase
        .from("teachers")
        .update(payload)
        .eq("id", form.id);

      if (updateError) {
        if (uploaded) {
          await deleteTeacherPhotoPath(uploaded.objectPath);
        }
        setError("O'qituvchini saqlab bo'lmadi.");
        setSaving(false);
        return;
      }

      if (uploaded && currentPhotoPath && currentPhotoPath !== uploaded.objectPath) {
        await deleteTeacherPhotoPath(currentPhotoPath);
      }

      setSuccess("O'qituvchi yangilandi.");
    } else {
      const { error: insertError } = await supabase.from("teachers").insert(payload);

      if (insertError) {
        if (uploaded) {
          await deleteTeacherPhotoPath(uploaded.objectPath);
        }
        setError("O'qituvchini yaratib bo'lmadi.");
        setSaving(false);
        return;
      }

      setSuccess("O'qituvchi qo'shildi.");
    }

    await loadTeachers();
    resetForm();
    setSaving(false);
  };

  const deleteTeacher = async (teacher: TeacherRow) => {
    const confirmed = window.confirm(`"${teacher.full_name}" o'qituvchisini o'chirmoqchimisiz?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(teacher.id);
    setError("");
    setSuccess("");

    const photoPath = getNewsImageObjectPath(teacher.photo_url);
    const { error: deleteError } = await supabase.from("teachers").delete().eq("id", teacher.id);

    if (deleteError) {
      setDeletingId(null);
      setError("O'qituvchini o'chirib bo'lmadi.");
      return;
    }

    if (photoPath) {
      await deleteTeacherPhotoPath(photoPath);
    }

    setSuccess("O'qituvchi o'chirildi.");
    await loadTeachers();
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
          <h1 className="mt-2 text-3xl font-semibold">O'qituvchilar boshqaruvi</h1>
          <p className="mt-2 text-sm text-slate-400">O'qituvchilarni qo'shish, tahrirlash va o'chirish.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold">{form.id ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                placeholder="F.I.Sh."
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder="Fan"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.department}
                onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                placeholder="Bo'lim"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={form.experience_years}
                onChange={(event) => setForm((prev) => ({ ...prev, experience_years: event.target.value }))}
                placeholder="Tajriba yillari"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.qualification}
                onChange={(event) => setForm((prev) => ({ ...prev, qualification: event.target.value }))}
                placeholder="Toifa"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <textarea
                value={form.biography}
                onChange={(event) => setForm((prev) => ({ ...prev, biography: event.target.value }))}
                placeholder="Qisqa bio"
                className="min-h-24 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                placeholder="Tartib raqami"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.photo_url}
                onChange={(event) => setForm((prev) => ({ ...prev, photo_url: event.target.value }))}
                placeholder="Rasm URL (ixtiyoriy)"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onPhotoSelected}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
              {selectedPhotoName ? <p className="text-xs text-slate-400">Tanlangan rasm: {selectedPhotoName}</p> : null}
              {uploadingPhoto ? <p className="text-xs text-slate-400">Rasm yuklanmoqda...</p> : null}

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_featured: event.target.checked }))}
                />
                Asosiy sahifada ko'rsatilsin
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Faol holatda
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveTeacher}
                disabled={saving}
                className="rounded-md border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saqlanmoqda..." : form.id ? "Saqlash" : "Qo'shish"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
              >
                Tozalash
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold">O'qituvchilar ro'yxati</h2>
            <p className="mt-1 text-xs text-slate-400">Tartib: sort_order, created_at</p>

            <div className="mt-4 space-y-3">
              {sortedTeachers.length === 0 ? (
                <div className="rounded-md border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                  Hozircha o'qituvchilar mavjud emas.
                </div>
              ) : (
                sortedTeachers.map((teacher) => (
                  <div key={teacher.id} className="rounded-md border border-slate-800 bg-slate-900/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-100">{teacher.full_name}</p>
                        <p className="text-sm text-slate-300">{teacher.subject ?? "Fan ko'rsatilmagan"}</p>
                        <p className="text-xs text-slate-400">
                          {teacher.qualification ?? "Toifa ko'rsatilmagan"} • {teacher.experience_years ?? 0} yil
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          sort_order: {teacher.sort_order} • {teacher.is_featured ? "featured" : "oddiy"} • {teacher.is_active ? "faol" : "nofaol"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(teacher)}
                          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-700"
                        >
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTeacher(teacher)}
                          disabled={deletingId === teacher.id}
                          className="rounded-md border border-rose-600/40 bg-rose-600/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-600/20 disabled:opacity-60"
                        >
                          {deletingId === teacher.id ? "O'chirilmoqda..." : "O'chirish"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        ) : null}

        {success ? (
          <div className="mt-5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>
        ) : null}
      </div>
    </div>
  );
}
