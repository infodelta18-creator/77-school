import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useState } from "react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type DocumentStatus = "draft" | "published" | "archived";

type DocumentRow = {
  id: string;
  title: string;
  category: string | null;
  file_url: string;
  file_type: string | null;
  status: DocumentStatus;
  published_at: string | null;
  created_at: string;
};

type DocumentForm = {
  id: string | null;
  title: string;
  category: string;
  status: DocumentStatus;
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

const initialForm: DocumentForm = {
  id: null,
  title: "",
  category: "",
  status: "draft",
};

export const Route = createFileRoute("/admin/documents")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminDocumentsPage,
});

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

function inferFileType(fileUrl: string, explicitType: string | null) {
  if (explicitType?.trim()) {
    return explicitType.trim().toUpperCase();
  }

  const extension = fileUrl.split("?")[0]?.split(".").pop()?.toUpperCase();
  return extension || "FILE";
}

function extractDocumentsObjectPath(fileUrl: string) {
  try {
    const parsed = new URL(fileUrl);
    const marker = "/storage/v1/object/public/documents/";
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

function getDocumentFileExtension(file: File) {
  const byMime = ALLOWED_DOC_TYPES[file.type];
  if (byMime) {
    return byMime;
  }

  const fallback = file.name.split(".").pop()?.toLowerCase();
  if (fallback && ["pdf", "doc", "docx", "xls", "xlsx"].includes(fallback)) {
    return fallback;
  }

  return null;
}

async function uploadDocumentFile(file: File) {
  const extension = getDocumentFileExtension(file);
  if (!extension) {
    return { path: null, url: null, error: "Fayl turi qo'llab-quvvatlanmaydi." };
  }

  const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    console.error("documents:file upload failed", uploadError);
    return { path: null, url: null, error: "Faylni yuklab bo'lmadi." };
  }

  const { data } = supabase.storage.from("documents").getPublicUrl(objectPath);
  return { path: objectPath, url: data.publicUrl, error: null as string | null };
}

function AdminDocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [form, setForm] = useState<DocumentForm>(initialForm);
  const [editingDocument, setEditingDocument] = useState<DocumentRow | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDocuments = async () => {
    const { data, error: fetchError } = await supabase
      .from("documents")
      .select("id, title, category, file_url, file_type, status, published_at, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Hujjatlarni yuklab bo'lmadi.");
      return;
    }

    setDocuments((data ?? []) as DocumentRow[]);
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
      await loadDocuments();
      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  const onFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError("");

    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    if (!getDocumentFileExtension(file) || (!ALLOWED_DOC_TYPES[file.type] && file.type)) {
      setError("Faqat PDF, DOC, DOCX, XLS yoki XLSX fayl yuklash mumkin.");
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Fayl hajmi 10MB dan oshmasligi kerak.");
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingDocument(null);
    setSelectedFile(null);
    setSelectedFileName("");
  };

  const startEdit = (item: DocumentRow) => {
    setForm({
      id: item.id,
      title: item.title,
      category: item.category ?? "",
      status: item.status,
    });
    setEditingDocument(item);
    setSelectedFile(null);
    setSelectedFileName("");
    setError("");
    setSuccess("");
  };

  const removeStorageObjectIfPossible = async (fileUrl: string) => {
    const objectPath = extractDocumentsObjectPath(fileUrl);
    if (!objectPath) {
      return;
    }

    await supabase.storage.from("documents").remove([objectPath]);
  };

  const saveDocument = async () => {
    if (!form.title.trim()) {
      setError("Hujjat nomi majburiy.");
      return;
    }

    const isCreate = !form.id;
    if (isCreate && !selectedFile) {
      setError("Fayl yuklash majburiy.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    let nextFileUrl = editingDocument?.file_url ?? null;
    let nextFileType = editingDocument?.file_type ?? null;
    let newObjectPath: string | null = null;

    if (selectedFile) {
      setUploading(true);
      const uploadResult = await uploadDocumentFile(selectedFile);
      setUploading(false);

      if (uploadResult.error || !uploadResult.url || !uploadResult.path) {
        setError(uploadResult.error ?? "Faylni yuklab bo'lmadi.");
        setSaving(false);
        return;
      }

      nextFileUrl = uploadResult.url;
      nextFileType = getDocumentFileExtension(selectedFile)?.toUpperCase() ?? null;
      newObjectPath = uploadResult.path;
    }

    const currentPublishedAt = editingDocument?.published_at ?? null;
    const nextPublishedAt =
      form.status === "published"
        ? currentPublishedAt ?? new Date().toISOString()
        : null;

    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || null,
      file_url: nextFileUrl,
      file_type: nextFileType,
      status: form.status,
      published_at: nextPublishedAt,
      ...(isCreate ? { created_by: currentUserId } : {}),
    };

    if (isCreate) {
      const { error: insertError } = await supabase.from("documents").insert(payload);
      if (insertError) {
        console.error("documents:insert failed", insertError);
        if (newObjectPath) {
          await supabase.storage.from("documents").remove([newObjectPath]);
        }
        setError("Hujjatni yaratib bo'lmadi.");
        setSaving(false);
        return;
      }

      setSuccess("Hujjat yaratildi.");
    } else {
      const { error: updateError } = await supabase.from("documents").update(payload).eq("id", form.id);
      if (updateError) {
        console.error("documents:update failed", updateError);
        if (newObjectPath) {
          await supabase.storage.from("documents").remove([newObjectPath]);
        }
        setError("Hujjatni saqlab bo'lmadi.");
        setSaving(false);
        return;
      }

      if (selectedFile && editingDocument?.file_url && editingDocument.file_url !== nextFileUrl) {
        await removeStorageObjectIfPossible(editingDocument.file_url);
      }

      setSuccess("Hujjat yangilandi.");
    }

    await loadDocuments();
    resetForm();
    setSaving(false);
  };

  const deleteDocument = async (item: DocumentRow) => {
    const confirmed = window.confirm(`"${item.title}" hujjatini o'chirmoqchimisiz?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase.from("documents").delete().eq("id", item.id);
    if (deleteError) {
      console.error("documents:delete failed", deleteError);
      setError("Hujjatni o'chirib bo'lmadi.");
      setDeletingId(null);
      return;
    }

    await removeStorageObjectIfPossible(item.file_url);
    setSuccess("Hujjat o'chirildi.");
    await loadDocuments();
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
          <h1 className="mt-2 text-3xl font-semibold">Hujjatlar boshqaruvi</h1>
          <p className="mt-2 text-sm text-slate-400">Hujjatlarni yuklash, tahrirlash va o'chirish.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold">{form.id ? "Hujjatni tahrirlash" : "Yangi hujjat"}</h2>
            <div className="mt-4 space-y-3">
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Hujjat nomi"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                placeholder="Kategoriya"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={onFileSelect}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
              {selectedFileName ? <p className="text-xs text-slate-400">Tanlangan fayl: {selectedFileName}</p> : null}
              {form.id && editingDocument?.file_url ? (
                <a
                  href={editingDocument.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-xs text-blue-300 underline underline-offset-2"
                >
                  Joriy faylni ochish
                </a>
              ) : null}
              {uploading ? <p className="text-xs text-slate-400">Fayl yuklanmoqda...</p> : null}
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as DocumentStatus }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveDocument}
                  disabled={saving || uploading}
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
            <h2 className="text-lg font-semibold">Mavjud hujjatlar</h2>
            <div className="mt-4 space-y-3">
              {documents.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                  Hozircha hujjatlar yo'q.
                </div>
              ) : (
                documents.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-700 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-slate-700 px-2 py-0.5">{item.status}</span>
                      <span className="rounded bg-slate-700 px-2 py-0.5">{inferFileType(item.file_url, item.file_type)}</span>
                      <span className="text-slate-400">{formatDateDDMMYYYY(item.published_at ?? item.created_at)}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{item.title}</h3>
                    {item.category ? <p className="mt-1 text-sm text-slate-300">{item.category}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium"
                      >
                        Faylni ochish
                      </a>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium"
                      >
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDocument(item)}
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
