import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type NewsStatus = "draft" | "published" | "archived";

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  external_link: string | null;
  external_link_label: string | null;
  status: NewsStatus;
  published_at: string | null;
  created_at: string;
};

type NewsForm = {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  external_link: string;
  external_link_label: string;
  status: "draft" | "published";
};

const initialForm: NewsForm = {
  id: null,
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image: "",
  external_link: "",
  external_link_label: "",
  status: "draft",
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const Route = createFileRoute("/admin/news")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminNewsPage,
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
    normalized = "yangilik";
  }

  return normalized;
}

async function generateUniqueSlug(baseInput: string, excludeId?: string) {
  const base = slugifyUzbek(baseInput);
  const { data, error } = await supabase.from("news").select("id, slug").ilike("slug", `${base}%`);

  if (error) {
    return base;
  }

  const used = new Set((data ?? []).filter((row) => row.id !== excludeId).map((row) => row.slug));
  if (!used.has(base)) {
    return base;
  }

  let index = 1;
  while (used.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}

function AdminNewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [newsList, setNewsList] = useState<NewsRow[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsForm>(initialForm);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadNews = async () => {
    const { data, error: fetchError } = await supabase
      .from("news")
      .select(
        "id, title, slug, excerpt, content, featured_image, external_link, external_link_label, status, published_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("news:load failed", fetchError);
      setError("Yangiliklarni yuklab bo'lmadi.");
      return;
    }

    setNewsList((data ?? []) as NewsRow[]);
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

      await loadNews();
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
    setSelectedImageFile(null);
    setSelectedImageName("");
  };

  const handleEdit = (item: NewsRow) => {
    setError("");
    setSuccess("");
    setSelectedImageFile(null);
    setSelectedImageName("");
    setForm({
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? "",
      content: item.content,
      featured_image: item.featured_image ?? "",
      external_link: item.external_link ?? "",
      external_link_label: item.external_link_label ?? "",
      status: item.status === "published" ? "published" : "draft",
    });
  };

  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImageFile(null);
      setSelectedImageName("");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setError("Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.");
      setSelectedImageFile(null);
      setSelectedImageName("");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Rasm hajmi 5MB dan oshmasligi kerak.");
      setSelectedImageFile(null);
      setSelectedImageName("");
      return;
    }

    setSelectedImageFile(file);
    setSelectedImageName(file.name);
  };

  const uploadImageIfSelected = async () => {
    if (!selectedImageFile) {
      return null;
    }

    setUploadingImage(true);
    const extension = ALLOWED_IMAGE_TYPES[selectedImageFile.type];
    const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(objectPath, selectedImageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: selectedImageFile.type,
      });

    if (uploadError) {
      console.error("news:image upload failed", uploadError);
      setUploadingImage(false);
      setError("Rasmni yuklab bo'lmadi.");
      return null;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(objectPath);
    setUploadingImage(false);
    setSelectedImageFile(null);
    setSelectedImageName("");
    return data.publicUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim() || !form.content.trim()) {
      setError("Sarlavha va kontent to'ldirilishi shart.");
      return;
    }

    setSaving(true);
    let uploadedImageUrl: string | null = null;
    if (selectedImageFile) {
      uploadedImageUrl = await uploadImageIfSelected();
      if (!uploadedImageUrl) {
        setSaving(false);
        return;
      }
    }

    const finalImage = uploadedImageUrl ?? (form.featured_image.trim() || null);

    const generatedSlug = await generateUniqueSlug(form.title, form.id ?? undefined);

    const payload = {
      title: form.title.trim(),
      slug: generatedSlug,
      excerpt: form.excerpt.trim() || null,
      content: form.content.trim(),
      featured_image: finalImage,
      external_link: form.external_link.trim() || null,
      external_link_label: form.external_link_label.trim() || null,
      status: form.status,
      published_at: form.status === "published" ? new Date().toISOString() : null,
    };

    if (form.id) {
      const { error: updateError } = await supabase.from("news").update(payload).eq("id", form.id);
      if (updateError) {
        console.error("news:update failed", updateError);
        setError("Yangilikni saqlab bo'lmadi.");
        setSaving(false);
        return;
      }
      setSuccess("Yangilik yangilandi.");
    } else {
      const { error: insertError } = await supabase.from("news").insert(payload);
      if (insertError) {
        console.error("news:insert failed", insertError);
        setError("Yangilik yaratib bo'lmadi.");
        setSaving(false);
        return;
      }
      setSuccess("Yangilik yaratildi.");
    }

    setForm((prev) => ({ ...prev, slug: generatedSlug, featured_image: uploadedImageUrl ?? prev.featured_image }));
    await loadNews();
    resetForm();
    setSaving(false);
  };

  const deleteNews = async (item: NewsRow) => {
    const confirmed = window.confirm(`"${item.title}" yangiligini o'chirmoqchimisiz?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    const { error: deleteError } = await supabase.from("news").delete().eq("id", item.id);

    if (deleteError) {
      console.error("news:delete failed", deleteError);
      setError("Yangilikni o'chirib bo'lmadi.");
      setDeletingId(null);
      return;
    }

    setSuccess("Yangilik o'chirildi.");
    await loadNews();
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#0E1322] p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-blue-400">Admin Panel</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Yangiliklar boshqaruvi</h1>
          <p className="mt-1 text-sm text-slate-400">Yangiliklar yaratish, tahrirlash va o'chirish.</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-bold text-white">{form.id ? "Yangilikni tahrirlash" : "Yangi yangilik"}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Sarlavha</label>
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
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: slugifyUzbek(event.target.value) }))}
                  placeholder="slug"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Qisqa mazmun (Excerpt)</label>
                <textarea
                  value={form.excerpt}
                  onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
                  placeholder="Qisqa mazmun"
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Batafsil matn (Content)</label>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="To'liq matn"
                  rows={6}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Muqova rasmi (URL)</label>
                <input
                  value={form.featured_image}
                  onChange={(event) => setForm((prev) => ({ ...prev, featured_image: event.target.value }))}
                  placeholder="Rasm URL havolasi"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Rasm fayli (Kompyuterdan yuklash)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageFileChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300"
                />
                {selectedImageName ? <p className="mt-1 text-xs text-blue-400 font-medium">Tanlandi: {selectedImageName}</p> : null}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tashqi havola (ixtiyoriy)</label>
                <input
                  value={form.external_link}
                  onChange={(event) => setForm((prev) => ({ ...prev, external_link: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      status: event.target.value === "published" ? "published" : "draft",
                    }))
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="draft">Qoralama (Draft)</option>
                  <option value="published">Chop etilgan (Published)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-blue-600/30"
                >
                  {saving || uploadingImage ? "Saqlanmoqda..." : form.id ? "Yangilash" : "Yaratish"}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Bekor qilish
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Mavjud yangiliklar ({newsList.length})</h2>
            {newsList.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">
                Hali yangiliklar qo'shilmagan.
              </div>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar">
                {newsList.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2 hover:border-slate-700 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm">{item.title}</h3>
                        <p className="font-mono text-xs text-blue-400">{item.slug}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          item.status === "published"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.excerpt ? <p className="text-xs text-slate-400 line-clamp-2">{item.excerpt}</p> : null}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => deleteNews(item)}
                        className="rounded-lg border border-rose-900/60 bg-rose-950/50 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/80 disabled:opacity-50"
                      >
                        {deletingId === item.id ? "O'chirilmoqda..." : "O'chirish"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
