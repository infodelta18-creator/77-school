import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type ReceptionRequestRow = {
  id: string;
  request_number: string;
  full_name: string;
  phone: string;
  email: string | null;
  request_type: string | null;
  subject: string;
  message: string;
  attachment_url: string | null;
  status: string;
  admin_reply?: string | null;
  created_at: string;
};

const RECEPTION_ATTACHMENTS_BUCKET = "reception-attachments";

export const Route = createFileRoute("/admin/reception")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminReceptionPage,
});

function formatDateTimeTashkent(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getAttachmentName(objectPath: string | null) {
  if (!objectPath) {
    return null;
  }

  const parts = objectPath.split("/");
  const last = parts[parts.length - 1] ?? "";
  return last || objectPath;
}

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("reject") || s.includes("rad")) {
    return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-rose-950/80 border border-rose-700/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">🔴 Rad etildi</span>;
  }
  if (s.includes("progress") || s.includes("korib") || s.includes("ko'rib") || s.includes("chiqilmoqda")) {
    return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-yellow-950/80 border border-yellow-700/80 px-2.5 py-0.5 text-[11px] font-bold text-yellow-300">🟡 Ko'rib chiqilmoqda</span>;
  }
  if (s.includes("completed") || s.includes("yakun")) {
    return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-blue-950/80 border border-blue-700/80 px-2.5 py-0.5 text-[11px] font-bold text-blue-300">✅ Yakunlandi</span>;
  }
  return <span className="inline-flex items-center whitespace-nowrap rounded-full bg-emerald-950/80 border border-emerald-700/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">🟢 Qabul qilindi</span>;
}

function AdminReceptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<ReceptionRequestRow[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ReceptionRequestRow | null>(null);
  const [statusDraft, setStatusDraft] = useState("accepted");
  const [replyDraft, setReplyDraft] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  const loadRequests = async () => {
    const { data, error: fetchError } = await supabase
      .from("reception_requests")
      .select("id, request_number, full_name, phone, email, request_type, subject, message, attachment_url, status, admin_reply, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Virtual qabulxona murojaatlarini yuklab bo'lmadi.");
      return;
    }

    setRequests((data ?? []) as ReceptionRequestRow[]);
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

      await loadRequests();
      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (selectedRequest) {
      setStatusDraft(selectedRequest.status || "accepted");
      setReplyDraft(selectedRequest.admin_reply || "");
    }
  }, [selectedRequest]);

  const selectedAttachmentName = useMemo(() => getAttachmentName(selectedRequest?.attachment_url ?? null), [selectedRequest]);

  const openAttachment = async (objectPath: string) => {
    setAttachmentBusy(true);
    setAttachmentError("");

    const { data, error: signedUrlError } = await supabase.storage
      .from(RECEPTION_ATTACHMENTS_BUCKET)
      .createSignedUrl(objectPath, 120);

    if (signedUrlError || !data?.signedUrl) {
      setAttachmentError("Faylga xavfsiz havola yaratib bo'lmadi.");
      setAttachmentBusy(false);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setAttachmentBusy(false);
  };

  const handleSaveStatusAndReply = async () => {
    if (!selectedRequest) return;
    setUpdatingStatus(true);

    const { error: updateError } = await supabase
      .from("reception_requests")
      .update({
        status: statusDraft,
        admin_reply: replyDraft.trim() || null,
      })
      .eq("id", selectedRequest.id);

    if (updateError) {
      setError("Status yoki javobni yangilab bo'lmadi.");
      setUpdatingStatus(false);
      return;
    }

    setSelectedRequest((prev) => (prev ? { ...prev, status: statusDraft, admin_reply: replyDraft.trim() || null } : null));
    await loadRequests();
    setUpdatingStatus(false);
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm("Ushbu murojaatni o'chirishni tasdiqlaysizmi?")) return;
    const { error: delErr } = await supabase.from("reception_requests").delete().eq("id", id);
    if (delErr) {
      setError("Murojaatni o'chirishda xatolik yuz berdi: " + delErr.message);
      return;
    }
    await loadRequests();
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
          <h1 className="mt-1 text-3xl font-bold text-white">Virtual qabulxona</h1>
          <p className="mt-1 text-sm text-slate-400">Virtual qabulxona orqali yuborilgan murojaatlar va ularning statusini boshqarish.</p>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        ) : null}

        {!error && requests.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">
            Hozircha virtual qabulxona murojaatlari topilmadi.
          </div>
        ) : null}

        {!error && requests.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">Raqam</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Sana</th>
                  <th className="px-4 py-3.5 text-left font-semibold">F.I.Sh.</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Telefon</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Turi</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Mavzu</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Holat</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {requests.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-800/30 transition">
                    <td className="px-4 py-4 font-mono font-bold text-blue-400">{item.request_number}</td>
                    <td className="px-4 py-4 text-slate-300 text-xs">{formatDateTimeTashkent(item.created_at)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-100">{item.full_name}</td>
                    <td className="px-4 py-4 text-slate-300 text-xs">{item.phone}</td>
                    <td className="px-4 py-4 text-slate-300 text-xs">{item.request_type || "-"}</td>
                    <td className="px-4 py-4 text-slate-300 text-xs max-w-xs truncate">{item.subject}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentError("");
                            setSelectedRequest(item);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-blue-600 hover:border-blue-500"
                        >
                          Boshqarish
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(item.id)}
                          title="Murojaatni o'chirish"
                          className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-1.5 text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <Dialog
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
            setAttachmentError("");
          }
        }}
      >
        <DialogContent className="border-slate-800 bg-[#0E1322] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Virtual qabulxona murojaati va statusi</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedRequest
                ? `${selectedRequest.request_number} - ${formatDateTimeTashkent(selectedRequest.created_at)}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest ? (
            <div className="space-y-4 text-sm max-h-[80vh] overflow-y-auto pr-1">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <p className="text-xs uppercase tracking-wide text-blue-400 font-bold">Murojaat Holati va Admin Javobi</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">Status tanlang:</label>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="accepted">🟢 Qabul qilindi</option>
                      <option value="in_progress">🟡 Ko'rib chiqilmoqda</option>
                      <option value="completed">✅ Yakunlandi</option>
                      <option value="rejected">🔴 Rad etildi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium">💬 Admin Javobi (Murojaatchiga yuboriladigan xabar):</label>
                    <textarea
                      rows={3}
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder="Murojaatchiga rasmiy javobingiz yoki ko'rilgan choralar haqida yozing..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveStatusAndReply}
                    disabled={updatingStatus}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 shadow-lg shadow-blue-600/30"
                  >
                    {updatingStatus ? "Saqlanmoqda..." : "Status va Javobni Saqlash"}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Murojaat raqami</p>
                <p className="mt-1 font-mono font-bold text-blue-400">{selectedRequest.request_number}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">F.I.Sh.</p>
                <p className="mt-1 text-slate-100 font-medium">{selectedRequest.full_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Telefon</p>
                <p className="mt-1 text-slate-100">{selectedRequest.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 text-slate-100">{selectedRequest.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Murojaat turi</p>
                <p className="mt-1 text-slate-100">{selectedRequest.request_type || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Mavzu</p>
                <p className="mt-1 text-slate-100 font-medium">{selectedRequest.subject}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Biriktirma</p>
                {selectedRequest.attachment_url ? (
                  <div className="mt-1 space-y-2">
                    <p className="text-slate-200">{selectedAttachmentName || "Fayl"}</p>
                    <button
                      type="button"
                      disabled={attachmentBusy}
                      onClick={() => openAttachment(selectedRequest.attachment_url as string)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
                    >
                      {attachmentBusy ? "Havola yaratilmoqda..." : "Xavfsiz ochish"}
                    </button>
                    {attachmentError ? <p className="text-xs text-rose-300">{attachmentError}</p> : null}
                  </div>
                ) : (
                  <p className="mt-1 text-slate-100">Biriktirma yo'q</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Xabar</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-3 text-slate-200 text-xs leading-relaxed">
                  {selectedRequest.message}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
