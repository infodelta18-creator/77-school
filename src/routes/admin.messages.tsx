import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type ContactMessageRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  status: string;
  admin_reply?: string | null;
  created_at: string;
};

export const Route = createFileRoute("/admin/messages")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminMessagesPage,
});

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
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

function AdminMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [error, setError] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageRow | null>(null);
  const [statusDraft, setStatusDraft] = useState("accepted");
  const [replyDraft, setReplyDraft] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadMessages = async () => {
    const { data, error: fetchError } = await supabase
      .from("contact_messages")
      .select("id, full_name, phone, email, subject, message, status, admin_reply, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Murojaatlarni yuklab bo'lmadi.");
      return;
    }

    setMessages((data ?? []) as ContactMessageRow[]);
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

      await loadMessages();
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
    if (selectedMessage) {
      setStatusDraft(selectedMessage.status || "accepted");
      setReplyDraft(selectedMessage.admin_reply || "");
    }
  }, [selectedMessage]);

  const handleSaveStatusAndReply = async () => {
    if (!selectedMessage) return;
    setUpdatingStatus(true);

    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({
        status: statusDraft,
        admin_reply: replyDraft.trim() || null,
      })
      .eq("id", selectedMessage.id);

    if (updateError) {
      setError("Status yoki javobni yangilab bo'lmadi.");
      setUpdatingStatus(false);
      return;
    }

    setSelectedMessage((prev) => (prev ? { ...prev, status: statusDraft, admin_reply: replyDraft.trim() || null } : null));
    await loadMessages();
    setUpdatingStatus(false);
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm("Ushbu xabarni o'chirishni tasdiqlaysizmi?")) return;
    const { error: delErr } = await supabase.from("contact_messages").delete().eq("id", id);
    if (delErr) {
      setError("Xabarni o'chirishda xatolik yuz berdi: " + delErr.message);
      return;
    }
    await loadMessages();
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
      <div className="rounded-2xl border border-slate-800 bg-[#0E1322] p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-blue-400">Admin Panel</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Murojaatlar (Aloqa)</h1>
          <p className="mt-1 text-sm text-slate-400">Saytdan yuborilgan aloqa murojaatlari va ularning statusini boshqarish.</p>
        </div>

        {error ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        ) : null}

        {!error && messages.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400">
            Hozircha murojaatlar topilmadi.
          </div>
        ) : null}

        {!error && messages.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 text-left font-semibold">Kod / ID</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Sana</th>
                  <th className="px-4 py-3.5 text-left font-semibold">F.I.Sh.</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Aloqa</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Mavzu</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Holat</th>
                  <th className="px-4 py-3.5 text-left font-semibold">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {messages.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-800/30 transition">
                    <td className="px-4 py-4 font-mono font-bold text-blue-400">MSG-2026-{item.id.slice(0, 6).toUpperCase()}</td>
                    <td className="px-4 py-4 text-slate-300 text-xs">{formatDateTime(item.created_at)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-100">{item.full_name}</td>
                    <td className="px-4 py-4 text-slate-300 text-xs">
                      <div>{item.phone || "-"}</div>
                      <div className="text-slate-400">{item.email || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-300 text-xs max-w-xs truncate">{item.subject || "-"}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMessage(item)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-100 transition hover:bg-blue-600 hover:border-blue-500"
                        >
                          Boshqarish
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(item.id)}
                          title="Xabarni o'chirish"
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

      <Dialog open={Boolean(selectedMessage)} onOpenChange={(open) => (!open ? setSelectedMessage(null) : null)}>
        <DialogContent className="border-slate-800 bg-[#0E1322] text-slate-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Murojaat tafsilotlari va statusi</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedMessage ? `${selectedMessage.full_name} - ${formatDateTime(selectedMessage.created_at)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedMessage ? (
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
                <p className="text-xs uppercase tracking-wide text-slate-400">Murojaat Kodi</p>
                <p className="mt-1 font-mono font-bold text-blue-400">MSG-2026-{selectedMessage.id.slice(0, 6).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">F.I.Sh.</p>
                <p className="mt-1 text-slate-100 font-medium">{selectedMessage.full_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Telefon</p>
                <p className="mt-1 text-slate-100">{selectedMessage.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 text-slate-100">{selectedMessage.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Mavzu</p>
                <p className="mt-1 text-slate-100 font-medium">{selectedMessage.subject || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Xabar</p>
                <p className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-3 text-slate-200 text-xs leading-relaxed">
                  {selectedMessage.message}
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}