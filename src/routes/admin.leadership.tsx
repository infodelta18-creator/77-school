import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import {
  LEADERSHIP_SELECT,
  getLeadershipImageObjectPath,
  type LeadershipRow,
} from "@/lib/leadership";

type LeadershipForm = {
  id: string | null;
  full_name: string;
  position: string;
  photo_url: string;
  phone: string;
  email: string;
  reception_days: string;
  biography: string;
  sort_order: string;
  is_active: boolean;
};

const initialForm: LeadershipForm = {
  id: null,
  full_name: "",
  position: "",
  photo_url: "",
  phone: "",
  email: "",
  reception_days: "",
  biography: "",
  sort_order: "0",
  is_active: true,
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const Route = createFileRoute("/admin/leadership")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLeadershipPage,
});

function toOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapLeadershipToForm(member: LeadershipRow): LeadershipForm {
  return {
    id: member.id,
    full_name: member.full_name,
    position: member.position,
    photo_url: member.photo_url ?? "",
    phone: member.phone ?? "",
    email: member.email ?? "",
    reception_days: member.reception_days ?? "",
    biography: member.biography ?? "",
    sort_order: member.sort_order.toString(),
    is_active: member.is_active,
  };
}

function AdminLeadershipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [members, setMembers] = useState<LeadershipRow[]>([]);
  const [form, setForm] = useState<LeadershipForm>(initialForm);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    [members],
  );

  const loadMembers = async () => {
    const { data, error: fetchError } = await supabase
      .from("leadership")
      .select(LEADERSHIP_SELECT)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError("Rahbariyat ma'lumotlarini yuklab bo'lmadi.");
      return;
    }

    setMembers((data ?? []) as LeadershipRow[]);
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

      await loadMembers();
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

  const startEdit = (member: LeadershipRow) => {
    setForm(mapLeadershipToForm(member));
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

  const uploadLeadershipPhotoIfSelected = async () => {
    if (!selectedPhoto) {
      return null;
    }

    const extension = ALLOWED_IMAGE_TYPES[selectedPhoto.type];
    const objectPath = `leadership/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

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

  const deleteLeadershipPhotoPath = async (path: string | null) => {
    if (!path) {
      return;
    }

    await supabase.storage.from("news-images").remove([path]);
  };

  const saveMember = async () => {
    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    const fullName = form.full_name.trim();
    const position = form.position.trim();

    if (fullName.length < 2) {
      setError("F.I.Sh. kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (!position) {
      setError("Lavozim majburiy.");
      return;
    }

    const sortOrder = form.sort_order.trim();
    if (!/^[-]?\d+$/.test(sortOrder)) {
      setError("Tartib raqami butun son bo'lishi kerak.");
      return;
    }

    setSaving(true);

    const uploaded = await uploadLeadershipPhotoIfSelected();
    if (selectedPhoto && !uploaded) {
      setSaving(false);
      return;
    }

    const currentPhotoPath = getLeadershipImageObjectPath(form.photo_url);

    const payload = {
      full_name: fullName,
      position,
      photo_url: uploaded?.publicUrl ?? toOptionalText(form.photo_url),
      phone: toOptionalText(form.phone),
      email: toOptionalText(form.email),
      reception_days: toOptionalText(form.reception_days),
      biography: toOptionalText(form.biography),
      sort_order: Number(sortOrder),
      is_active: form.is_active,
    };

    if (form.id) {
      const { error: updateError } = await supabase
        .from("leadership")
        .update(payload)
        .eq("id", form.id);

      if (updateError) {
        if (uploaded) {
          await deleteLeadershipPhotoPath(uploaded.objectPath);
        }
        setError("Rahbar ma'lumotini saqlab bo'lmadi.");
        setSaving(false);
        return;
      }

      if (uploaded && currentPhotoPath && currentPhotoPath !== uploaded.objectPath) {
        await deleteLeadershipPhotoPath(currentPhotoPath);
      }

      setSuccess("Rahbar ma'lumoti yangilandi.");
    } else {
      const { error: insertError } = await supabase.from("leadership").insert(payload);

      if (insertError) {
        if (uploaded) {
          await deleteLeadershipPhotoPath(uploaded.objectPath);
        }
        setError("Rahbar qo'shib bo'lmadi.");
        setSaving(false);
        return;
      }

      setSuccess("Rahbar qo'shildi.");
    }

    await loadMembers();
    resetForm();
    setSaving(false);
  };

  const deleteMember = async (member: LeadershipRow) => {
    const confirmed = window.confirm(`"${member.full_name}" ni o'chirmoqchimisiz?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(member.id);
    setError("");
    setSuccess("");

    const photoPath = getLeadershipImageObjectPath(member.photo_url);
    const { error: deleteError } = await supabase.from("leadership").delete().eq("id", member.id);

    if (deleteError) {
      setDeletingId(null);
      setError("Rahbarni o'chirib bo'lmadi.");
      return;
    }

    if (photoPath) {
      await deleteLeadershipPhotoPath(photoPath);
    }

    setSuccess("Rahbar o'chirildi.");
    await loadMembers();
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
          <h1 className="mt-2 text-3xl font-semibold">Rahbariyat boshqaruvi</h1>
          <p className="mt-2 text-sm text-slate-400">Rahbarlarni qo'shish, tahrirlash va o'chirish.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold">{form.id ? "Rahbarni tahrirlash" : "Yangi rahbar"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                placeholder="F.I.Sh."
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                placeholder="Lavozim"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Telefon"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.reception_days}
                onChange={(event) => setForm((prev) => ({ ...prev, reception_days: event.target.value }))}
                placeholder="Qabul kunlari"
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
                  checked={form.is_active}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Faol holatda
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveMember}
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
            <h2 className="text-lg font-semibold">Rahbarlar ro'yxati</h2>
            <p className="mt-1 text-xs text-slate-400">Tartib: sort_order</p>

            <div className="mt-4 space-y-3">
              {sortedMembers.length === 0 ? (
                <div className="rounded-md border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                  Hozircha rahbarlar mavjud emas.
                </div>
              ) : (
                sortedMembers.map((member) => (
                  <div key={member.id} className="rounded-md border border-slate-800 bg-slate-900/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-100">{member.full_name}</p>
                        <p className="text-sm text-slate-300">{member.position}</p>
                        <p className="text-xs text-slate-400">sort_order: {member.sort_order} • {member.is_active ? "faol" : "nofaol"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(member)}
                          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-700"
                        >
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMember(member)}
                          disabled={deletingId === member.id}
                          className="rounded-md border border-rose-600/40 bg-rose-600/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-600/20 disabled:opacity-60"
                        >
                          {deletingId === member.id ? "O'chirilmoqda..." : "O'chirish"}
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
