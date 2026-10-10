import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { 
  Plus, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Pencil, 
  Trash2, 
  X,
  Youtube
} from "lucide-react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { isYouTubeUrl, getYouTubeThumbnail, extractYouTubeId } from "@/lib/youtube";
import { AdminLayout } from "@/components/admin/AdminLayout";

type AlbumRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  event_date: string | null;
  created_at: string;
};

type ImageRow = {
  id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type AlbumForm = {
  id: string | null;
  title: string;
  description: string;
  event_date: string;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const initialAlbumForm: AlbumForm = {
  id: null,
  title: "",
  description: "",
  event_date: "",
};

export const Route = createFileRoute("/admin/gallery")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminGalleryPage,
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
    normalized = "albom";
  }

  return normalized;
}

async function generateUniqueAlbumSlug(baseInput: string) {
  const base = slugifyUzbek(baseInput);
  const { data, error } = await supabase.from("gallery_albums").select("slug").ilike("slug", `${base}%`);

  if (error) {
    return base;
  }

  const used = new Set((data ?? []).map((row) => row.slug));
  if (!used.has(base)) {
    return base;
  }

  let i = 2;
  while (used.has(`${base}-${i}`)) {
    i += 1;
  }

  return `${base}-${i}`;
}

function extractGalleryObjectPath(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    const marker = "/storage/v1/object/public/gallery-images/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }

    const rawPath = parsed.pathname.slice(index + marker.length);
    if (!rawPath) {
      return null;
    }

    return decodeURIComponent(rawPath);
  } catch {
    return null;
  }
}

function formatDateYYYYMMDD(value: string | null) {
  if (!value) return "";
  const [datePart] = value.split("T");
  return datePart || "";
}

function formatDateDisplay(value: string | null) {
  if (!value) return "-";
  const [datePart] = value.split("T");
  return datePart || value;
}

function AdminGalleryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);

  // Forms
  const [albumForm, setAlbumForm] = useState<AlbumForm>(initialAlbumForm);

  // Modals for Media
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [editingMediaItem, setEditingMediaItem] = useState<ImageRow | null>(null);

  // Photo form fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");

  // Video form fields
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAll = async () => {
    const [albumsResult, imagesResult] = await Promise.all([
      supabase
        .from("gallery_albums")
        .select("id, title, slug, description, cover_image, event_date, created_at")
        .order("event_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("gallery_images")
        .select("id, album_id, image_url, caption, sort_order, created_at")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    if (albumsResult.error || imagesResult.error) {
      setError("Galereya ma'lumotlarini yuklab bo'lmadi.");
      return;
    }

    const fetchedAlbums = (albumsResult.data ?? []) as AlbumRow[];
    setAlbums(fetchedAlbums);
    setImages((imagesResult.data ?? []) as ImageRow[]);

    if (fetchedAlbums.length > 0 && !activeAlbumId) {
      setActiveAlbumId(fetchedAlbums[0].id);
    }
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

      await loadAll();
      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  const activeAlbum = useMemo(
    () => albums.find((a) => a.id === activeAlbumId) ?? null,
    [albums, activeAlbumId]
  );

  const activeAlbumMedia = useMemo(
    () => images.filter((img) => img.album_id === activeAlbumId),
    [images, activeAlbumId]
  );

  const startEditAlbum = (album: AlbumRow) => {
    setActiveAlbumId(album.id);
    setAlbumForm({
      id: album.id,
      title: album.title,
      description: album.description ?? "",
      event_date: formatDateYYYYMMDD(album.event_date),
    });
    setError("");
    setSuccess("");
  };

  const resetAlbumForm = () => {
    setAlbumForm(initialAlbumForm);
    setError("");
    setSuccess("");
  };

  const saveAlbum = async () => {
    if (!albumForm.title.trim()) {
      setError("Albom nomi majburiy.");
      return;
    }

    setSavingAlbum(true);
    setError("");
    setSuccess("");

    if (albumForm.id) {
      // Update
      const payload = {
        title: albumForm.title.trim(),
        description: albumForm.description.trim() || null,
        event_date: albumForm.event_date || null,
      };

      const { error: updateError } = await supabase
        .from("gallery_albums")
        .update(payload)
        .eq("id", albumForm.id);

      if (updateError) {
        setError("Albomni yangilab bo'lmadi.");
        setSavingAlbum(false);
        return;
      }

      setSuccess("Albom yangilandi.");
    } else {
      // Create
      const slug = await generateUniqueAlbumSlug(albumForm.title.trim());
      const payload = {
        title: albumForm.title.trim(),
        slug,
        description: albumForm.description.trim() || null,
        event_date: albumForm.event_date || null,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("gallery_albums")
        .insert(payload)
        .select("id")
        .single();

      if (insertError || !inserted) {
        setError("Albom yaratib bo'lmadi.");
        setSavingAlbum(false);
        return;
      }

      setActiveAlbumId(inserted.id);
      setSuccess("Albom yaratildi.");
    }

    await loadAll();
    setSavingAlbum(false);
  };

  const deleteAlbum = async (album: AlbumRow) => {
    if (!window.confirm(`"${album.title}" albomini va undagi barcha fayllarni o'chirmoqchimisiz?`)) {
      return;
    }

    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("gallery_albums").delete().eq("id", album.id);

    if (deleteError) {
      setError("Albomni o'chirib bo'lmadi.");
      return;
    }

    if (activeAlbumId === album.id) {
      setActiveAlbumId(null);
      resetAlbumForm();
    }

    setSuccess("Albom o'chirildi.");
    await loadAll();
  };

  // --- Photo Upload ---
  const onFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES[file.type]) {
      setError("Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.");
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Rasm hajmi 5MB dan oshmasligi kerak.");
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  const handleSavePhoto = async () => {
    if (!activeAlbumId) {
      setError("Avval albomni tanlang.");
      return;
    }

    if (!editingMediaItem && !selectedFile) {
      setError("Rasm faylini tanlang.");
      return;
    }

    setSavingMedia(true);
    setError("");
    setSuccess("");

    let imageUrl = editingMediaItem?.image_url || "";

    if (selectedFile) {
      const extension = ALLOWED_IMAGE_TYPES[selectedFile.type] || "jpg";
      const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(objectPath, selectedFile, { cacheControl: "3600", upsert: false, contentType: selectedFile.type });

      if (uploadError) {
        setError("Rasmni yuklab bo'lmadi.");
        setSavingMedia(false);
        return;
      }

      const { data } = supabase.storage.from("gallery-images").getPublicUrl(objectPath);
      imageUrl = data.publicUrl;
    }

    if (editingMediaItem) {
      // Update
      const { error: updateError } = await supabase
        .from("gallery_images")
        .update({
          image_url: imageUrl,
          caption: photoCaption.trim() || null,
        })
        .eq("id", editingMediaItem.id);

      if (updateError) {
        setError("Media obyektini yangilab bo'lmadi.");
        setSavingMedia(false);
        return;
      }
      setSuccess("Rasm yangilandi.");
    } else {
      // Create
      const maxSortOrder = activeAlbumMedia.length > 0 
        ? Math.max(...activeAlbumMedia.map(m => m.sort_order)) + 1 
        : 1;

      const { error: insertError } = await supabase.from("gallery_images").insert({
        album_id: activeAlbumId,
        image_url: imageUrl,
        caption: photoCaption.trim() || null,
        sort_order: maxSortOrder,
      });

      if (insertError) {
        setError("Rasmni saqlab bo'lmadi.");
        setSavingMedia(false);
        return;
      }
      setSuccess("Media muvaffaqiyatli qo'shildi.");
    }

    await loadAll();
    closeMediaModal();
    setSavingMedia(false);
  };

  // --- YouTube Video Add ---
  const handleSaveVideo = async () => {
    if (!activeAlbumId) {
      setError("Avval albomni tanlang.");
      return;
    }

    if (!videoUrl.trim() || !extractYouTubeId(videoUrl)) {
      setError("To'g'ri YouTube video havolasini kiriting (masalan: https://www.youtube.com/watch?v=...)");
      return;
    }

    setSavingMedia(true);
    setError("");
    setSuccess("");

    if (editingMediaItem) {
      const { error: updateError } = await supabase
        .from("gallery_images")
        .update({
          image_url: videoUrl.trim(),
          caption: videoCaption.trim() || null,
        })
        .eq("id", editingMediaItem.id);

      if (updateError) {
        setError("Videoni yangilab bo'lmadi.");
        setSavingMedia(false);
        return;
      }
      setSuccess("Video yangilandi.");
    } else {
      const maxSortOrder = activeAlbumMedia.length > 0 
        ? Math.max(...activeAlbumMedia.map(m => m.sort_order)) + 1 
        : 1;

      const { error: insertError } = await supabase.from("gallery_images").insert({
        album_id: activeAlbumId,
        image_url: videoUrl.trim(),
        caption: videoCaption.trim() || null,
        sort_order: maxSortOrder,
      });

      if (insertError) {
        setError("Videoni saqlab bo'lmadi.");
        setSavingMedia(false);
        return;
      }
      setSuccess("Media muvaffaqiyatli qo'shildi.");
    }

    await loadAll();
    closeMediaModal();
    setSavingMedia(false);
  };

  const openEditMedia = (item: ImageRow) => {
    setEditingMediaItem(item);
    if (isYouTubeUrl(item.image_url)) {
      setVideoUrl(item.image_url);
      setVideoCaption(item.caption || "");
      setShowAddVideoModal(true);
    } else {
      setPhotoCaption(item.caption || "");
      setSelectedFile(null);
      setSelectedFileName("");
      setShowAddPhotoModal(true);
    }
  };

  const closeMediaModal = () => {
    setShowAddPhotoModal(false);
    setShowAddVideoModal(false);
    setEditingMediaItem(null);
    setSelectedFile(null);
    setSelectedFileName("");
    setPhotoCaption("");
    setVideoUrl("");
    setVideoCaption("");
  };

  const deleteMediaItem = async (item: ImageRow) => {
    if (!window.confirm("Ushbu media faylni o'chirmoqchimisiz?")) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("gallery_images").delete().eq("id", item.id);
    if (deleteError) {
      setError("Media faylni o'chirib bo'lmadi.");
      setDeletingId(null);
      return;
    }

    if (!isYouTubeUrl(item.image_url)) {
      const objectPath = extractGalleryObjectPath(item.image_url);
      if (objectPath) {
        await supabase.storage.from("gallery-images").remove([objectPath]);
      }
    }

    setSuccess("Media o'chirildi.");
    await loadAll();
    setDeletingId(null);
  };

  // --- Reordering Up / Down ---
  const moveMediaItem = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeAlbumMedia.length) return;

    const itemA = activeAlbumMedia[index];
    const itemB = activeAlbumMedia[targetIndex];

    const tempOrder = itemA.sort_order;
    itemA.sort_order = itemB.sort_order;
    itemB.sort_order = tempOrder;

    // Batch update
    await Promise.all([
      supabase.from("gallery_images").update({ sort_order: itemA.sort_order }).eq("id", itemA.id),
      supabase.from("gallery_images").update({ sort_order: itemB.sort_order }).eq("id", itemB.id),
    ]);

    await loadAll();
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
        {/* Top Title Banner */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Enterprise Media System: Albomlar yaratish, cheksiz foto va YouTube videolarni biriktirish hamda tartiblash.
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Galereya boshqaruvi
          </h1>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Main Grid: Left (Album Form) | Right (Album List) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column: Albomni tahrirlash / Yangi albom */}
          <div className="rounded-xl border border-slate-800 bg-[#0B132B]/80 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white">
              {albumForm.id ? "Albomni tahrirlash" : "Yangi albom ochish"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Albom nomi</label>
                <input
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Albom nomini kiriting..."
                  className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Tavsif / izoh</label>
                <textarea
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Albom haqida qisqacha ma'lumot..."
                  rows={4}
                  className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Sana</label>
                <input
                  type="date"
                  value={albumForm.event_date}
                  onChange={(e) => setAlbumForm((prev) => ({ ...prev, event_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveAlbum}
                  disabled={savingAlbum}
                  className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {savingAlbum ? "Saqlanmoqda..." : albumForm.id ? "Yangilash" : "Albom yaratish"}
                </button>
                {albumForm.id && (
                  <button
                    type="button"
                    onClick={resetAlbumForm}
                    className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Yangi albom ochish
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Mavjud foto & video albomlar */}
          <div className="rounded-xl border border-slate-800 bg-[#0B132B]/80 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white">Mavjud foto & video albomlar</h2>
            <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {albums.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                  Hozircha albomlar mavjud emas.
                </div>
              ) : (
                albums.map((album) => {
                  const isActive = activeAlbumId === album.id;
                  return (
                    <div
                      key={album.id}
                      className={`rounded-lg border p-4 transition ${
                        isActive
                          ? "border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/30"
                          : "border-slate-800 bg-[#0F172A]/70 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">{album.title}</h3>
                          {album.description && (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                              {album.description}
                            </p>
                          )}
                          <p className="mt-2 text-[11px] text-slate-500">
                            Sana: {formatDateDisplay(album.event_date)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditAlbum(album)}
                            className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                          >
                            Boshqarish
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAlbum(album)}
                            className="rounded border border-red-800/80 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/60"
                          >
                            O'chirish
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section: Media Fayllar & YouTube Videolar for Active Album */}
        {activeAlbum && (
          <div className="rounded-xl border border-slate-800 bg-[#0B132B]/80 p-6 shadow-xl space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Media Fayllar & YouTube Videolar</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {activeAlbumMedia.length} ta media fayl biriktirilgan (Cheksiz rasm va video qo'shish, surib tartiblash mumkin).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMediaItem(null);
                    setSelectedFile(null);
                    setSelectedFileName("");
                    setPhotoCaption("");
                    setShowAddPhotoModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Rasm Qo'shish
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingMediaItem(null);
                    setVideoUrl("");
                    setVideoCaption("");
                    setShowAddVideoModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  YouTube Video
                </button>
              </div>
            </div>

            {/* List of Media Items */}
            <div className="space-y-3 pt-2">
              {activeAlbumMedia.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                  Ushbu albomga hich qanday rasm yoki video qo'shilmadi. Yuqoridagi tugmalar orqali media qo'shing.
                </div>
              ) : (
                activeAlbumMedia.map((item, index) => {
                  const isVid = isYouTubeUrl(item.image_url);
                  const thumb = isVid
                    ? getYouTubeThumbnail(item.image_url)
                    : item.image_url;

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-[#0F172A] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3.5 overflow-hidden">
                        {/* Drag Handle Icon */}
                        <div className="cursor-grab text-slate-600 hover:text-slate-400">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        {/* Thumbnail */}
                        <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded border border-slate-700 bg-slate-900">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-600">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                          )}
                          {isVid && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Youtube className="h-5 w-5 text-red-500 fill-white" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                            {isVid ? (
                              <span className="inline-flex items-center gap-1 rounded bg-red-950/80 border border-red-700/60 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                                <Youtube className="h-3 w-3" />
                                YouTube Video
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-950/80 border border-blue-700/60 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
                                <ImageIcon className="h-3 w-3" />
                                Rasm
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-300" title={item.image_url}>
                            {item.image_url}
                          </p>
                          {item.caption && (
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {item.caption}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Controls: Reorder Up/Down | Edit | Delete */}
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => moveMediaItem(index, "up")}
                          disabled={index === 0}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                          title="Yuqoriga surish"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveMediaItem(index, "down")}
                          disabled={index === activeAlbumMedia.length - 1}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                          title="Pastga surish"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditMedia(item)}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-blue-400"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMediaItem(item)}
                          disabled={deletingId === item.id}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-950 hover:text-red-400 disabled:opacity-30"
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Modal: Add/Edit Photo */}
        {showAddPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white">
                  {editingMediaItem ? "Rasmni tahrirlash" : "Yangi rasm qo'shish"}
                </h3>
                <button
                  onClick={closeMediaModal}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Rasm faylini tanlang</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={onFileSelect}
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
                  />
                  {selectedFileName && (
                    <p className="mt-1 text-xs text-blue-400">Tanlandi: {selectedFileName}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Rasm izohi (ixtiyoriy)</label>
                  <textarea
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Rasm haqida qisqacha ma'lumot..."
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeMediaModal}
                    className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePhoto}
                    disabled={savingMedia}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {savingMedia ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add/Edit YouTube Video */}
        {showAddVideoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0B132B] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-500" />
                  {editingMediaItem ? "YouTube videoni tahrirlash" : "YouTube Video qo'shish"}
                </h3>
                <button
                  onClick={closeMediaModal}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">YouTube video havolasi (URL)</label>
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  />
                  {videoUrl && extractYouTubeId(videoUrl) && (
                    <div className="mt-3 overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                      <img
                        src={getYouTubeThumbnail(videoUrl)}
                        alt="Preview"
                        className="h-32 w-full object-cover"
                      />
                      <p className="p-1.5 text-center text-[11px] text-emerald-400 font-medium">
                        ✓ YouTube Video ID topildi
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">Video izohi (ixtiyoriy)</label>
                  <textarea
                    value={videoCaption}
                    onChange={(e) => setVideoCaption(e.target.value)}
                    placeholder="Video haqida qisqacha ma'lumot..."
                    rows={3}
                    className="w-full rounded-md border border-slate-700 bg-[#0F172A] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeMediaModal}
                    className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVideo}
                    disabled={savingMedia}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    {savingMedia ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
