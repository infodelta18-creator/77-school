import { useState, useEffect } from "react";
import { Search, CheckCircle2, Clock, AlertCircle, Copy, Check, Info, MessageSquare, XCircle, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatusInfo = {
  label: string;
  badgeClass: string;
  cardClass: string;
  description: string;
  icon: typeof CheckCircle2;
};

const ACCEPTED_STATUS: StatusInfo = {
  label: "🟢 Qabul qilindi",
  badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cardClass: "border-emerald-200 bg-emerald-50/50",
  description: "Murojaatingiz tizimga kelib tushdi va qabul qilindi, mas'ul xodimlar tomonidan ko'rib chiqiladi.",
  icon: CheckCircle2,
};

const IN_PROGRESS_STATUS: StatusInfo = {
  label: "🟡 Ko'rib chiqilmoqda",
  badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
  cardClass: "border-yellow-200 bg-yellow-50/50",
  description: "Murojaatingiz o'rganilmoqda va ko'rib chiqish jarayonida.",
  icon: Clock,
};

const COMPLETED_STATUS: StatusInfo = {
  label: "✅ Yakunlandi",
  badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  cardClass: "border-blue-200 bg-blue-50/50",
  description: "Murojaatingiz bo'yicha tegishli chora ko'rildi va jarayon yakunlandi.",
  icon: CheckCircle2,
};

const REJECTED_STATUS: StatusInfo = {
  label: "🔴 Rad etildi",
  badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
  cardClass: "border-rose-200 bg-rose-50/50",
  description: "Murojaatingiz o'rganib chiqildi va rad etildi.",
  icon: XCircle,
};

function getStatusInfo(rawStatus: string): StatusInfo {
  const s = (rawStatus || "").toLowerCase().trim();

  // 1. Rejected states
  if (
    s.includes("reject") ||
    s.includes("rad") ||
    s.includes("denied") ||
    s.includes("bekor")
  ) {
    return REJECTED_STATUS;
  }

  // 2. Completed states
  if (
    s.includes("completed") ||
    s.includes("yakun") ||
    s.includes("resolved") ||
    s.includes("closed") ||
    s.includes("bajarildi")
  ) {
    return COMPLETED_STATUS;
  }

  // 3. In Progress / Review / Processing states
  if (
    s.includes("progress") ||
    s.includes("korib") ||
    s.includes("ko'rib") ||
    s.includes("ko’rib") ||
    s.includes("koʻrib") ||
    s.includes("chiqilmoqda") ||
    s.includes("review") ||
    s.includes("process") ||
    s.includes("organil") ||
    s.includes("o'rganil") ||
    s.includes("tekshir") ||
    s.includes("pending")
  ) {
    return IN_PROGRESS_STATUS;
  }

  // 4. Brand new or accepted states
  return ACCEPTED_STATUS;
}

type SearchResult = {
  found: boolean;
  code: string;
  typeLabel: string;
  fullName: string;
  subject: string;
  createdAt: string;
  status: string;
  adminReply?: string | null;
};

export function StatusChecker({ defaultCode }: { defaultCode?: string }) {
  const [code, setCode] = useState(defaultCode || "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCheck = async (searchCodeOverride?: string) => {
    let targetCode = (searchCodeOverride || code).trim();
    if (!targetCode) {
      setErrorMsg("Iltimos, murojaat kodini kiriting.");
      return;
    }

    targetCode = targetCode.replace(/\s+/g, "-").toUpperCase();
    const shortCode = targetCode.replace(/^(VR|MSG)-2026-/i, "").toLowerCase();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetCode);

    setLoading(true);
    setErrorMsg("");
    setSearched(true);
    setResult(null);

    try {
      // 1. PostgreSQL RPC Lookup (get_murojaat_status) - 100% Security Definer & Instant
      const { data: rpcData } = await supabase.rpc("get_murojaat_status", {
        p_code: targetCode,
      });

      if (rpcData && typeof rpcData === "object" && (rpcData as any).found) {
        const res = rpcData as any;
        setResult({
          found: true,
          code: res.code,
          typeLabel: res.type_label || "Murojaat",
          fullName: res.full_name || "Murojaatchi",
          subject: res.subject || "Mavzu",
          createdAt: res.created_at || "",
          status: res.status || "accepted",
          adminReply: res.admin_reply || null,
        });
        setLoading(false);
        return;
      }

      // 2. Check Virtual Qabulxona (reception_requests) fallback
      let recData: {
        id: string;
        request_number: string;
        full_name: string;
        subject: string;
        status: string;
        admin_reply?: string | null;
        created_at: string;
      } | null = null;

      if (isUUID) {
        const { data } = await supabase
          .from("reception_requests")
          .select("id, request_number, full_name, subject, status, admin_reply, created_at")
          .eq("id", targetCode)
          .maybeSingle();
        recData = data;
      } else {
        const vrPattern = targetCode.startsWith("VR") ? targetCode : `%${shortCode}%`;
        const { data } = await supabase
          .from("reception_requests")
          .select("id, request_number, full_name, subject, status, admin_reply, created_at")
          .ilike("request_number", vrPattern)
          .limit(1);
        recData = data && data.length > 0 ? data[0] : null;
      }

      if (recData) {
        setResult({
          found: true,
          code: recData.request_number || recData.id,
          typeLabel: "Virtual Qabulxona Murojaati",
          fullName: recData.full_name,
          subject: recData.subject,
          createdAt: recData.created_at,
          status: recData.status || "accepted",
          adminReply: recData.admin_reply || null,
        });
        setLoading(false);
        return;
      }

      // 3. Check Contact Messages (contact_messages) fallback
      let contactData: {
        id: string;
        full_name: string;
        subject?: string | null;
        status: string;
        admin_reply?: string | null;
        created_at: string;
      } | null = null;

      if (isUUID) {
        const { data } = await supabase
          .from("contact_messages")
          .select("id, full_name, subject, status, admin_reply, created_at")
          .eq("id", targetCode)
          .maybeSingle();
        contactData = data;
      } else if (shortCode.length >= 3) {
        if (/^[0-9a-f]+$/i.test(shortCode)) {
          const minUuid = `${shortCode.padEnd(8, "0")}-0000-0000-0000-000000000000`;
          const maxUuid = `${shortCode.padEnd(8, "f")}-ffff-ffff-ffff-ffffffffffff`;

          const { data } = await supabase
            .from("contact_messages")
            .select("id, full_name, subject, status, admin_reply, created_at")
            .gte("id", minUuid)
            .lte("id", maxUuid)
            .limit(1);

          contactData = data && data.length > 0 ? data[0] : null;
        }

        if (!contactData) {
          const { data: recentMsgs } = await supabase
            .from("contact_messages")
            .select("id, full_name, subject, status, admin_reply, created_at")
            .order("created_at", { ascending: false })
            .limit(100);

          contactData = recentMsgs?.find((m) => m.id.toLowerCase().startsWith(shortCode)) || null;
        }
      }

      if (contactData) {
        setResult({
          found: true,
          code: `MSG-2026-${contactData.id.slice(0, 6).toUpperCase()}`,
          typeLabel: "Bog'lanish Xabari",
          fullName: contactData.full_name,
          subject: contactData.subject || "Murojaat",
          createdAt: contactData.created_at,
          status: contactData.status || "accepted",
          adminReply: contactData.admin_reply || null,
        });
        setLoading(false);
        return;
      }

      // Not found
      setResult(null);
      setErrorMsg(`"${targetCode}" kodli murojaat topilmadi. Kodingizni to'g'ri kiritganingizni tekshiring.`);
    } catch {
      setErrorMsg("Murojaat holatini tekshirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener & 3s polling fallback for active result
  useEffect(() => {
    if (!result?.code) return;

    let isSubscribed = true;

    const refreshStatus = async () => {
      if (!isSubscribed || !result?.code) return;

      const { data: rpcData } = await supabase.rpc("get_murojaat_status", {
        p_code: result.code,
      });

      if (rpcData && typeof rpcData === "object" && (rpcData as any).found && isSubscribed) {
        const res = rpcData as any;
        setResult((prev) =>
          prev && (prev.status !== res.status || prev.adminReply !== (res.admin_reply || null))
            ? { ...prev, status: res.status || "accepted", adminReply: res.admin_reply || null }
            : prev
        );
      }
    };

    const channel = supabase
      .channel(`murojaat-status-${result.code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reception_requests" }, () => {
        refreshStatus();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contact_messages" }, () => {
        refreshStatus();
      })
      .subscribe();

    const intervalId = setInterval(refreshStatus, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [result?.code]);

  const handleCopy = () => {
    if (!result?.code) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusInfo = getStatusInfo(result?.status || "accepted");
  const StatusIcon = statusInfo.icon;

  return (
    <div className="rounded-2xl border border-primary/20 bg-background p-6 sm:p-8 shadow-card space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Info className="h-3.5 w-3.5" />
            Onlayn Xizmat
          </div>
          {searched && result && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[11px] font-semibold text-emerald-700 animate-pulse">
              <Radio className="h-3 w-3 text-emerald-600 animate-ping" />
              <span>Real-vaqt kuzatish faol</span>
            </div>
          )}
        </div>
        <h3 className="font-display text-xl font-bold text-primary-dark">
          Murojaat Holatini Tekshirish
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Sizga berilgan takrorlanmas murojaat kodini (masalan: <code className="font-mono text-primary font-bold">VR-2026-235319</code> yoki <code className="font-mono text-primary font-bold">MSG-2026-377484</code>) kiriting va statusni real vaqtda kuzating.
        </p>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCheck();
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Murojaat kodini kiriting (VR-2026-... yoki MSG-2026-...)"
            className="h-12 w-full rounded-xl border border-border bg-surface-muted pl-10 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-[#003B7A] px-6 text-sm font-bold text-white shadow-md transition hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Tekshirilmoqda...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Tekshirish
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm font-medium text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Result Display */}
      {searched && result && (
        <div className={`rounded-xl border p-6 space-y-5 ${statusInfo.cardClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {result.typeLabel}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-lg font-bold text-primary-dark">
                  {result.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded bg-white/80 border border-border px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-white"
                  title="Kodni nusxalash"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Nusxalandi</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-slate-500" />
                      Nusxalash
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold ${statusInfo.badgeClass}`}>
              <StatusIcon className="h-4 w-4" />
              <span>{statusInfo.label}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground">
              Murojaatchi: <span className="font-normal text-muted-foreground">{result.fullName}</span>
            </h4>
            <p className="text-xs sm:text-sm text-foreground">
              <span className="font-semibold">Mavzu:</span> {result.subject}
            </p>
            <div className="pt-2 border-t border-border/40">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                Murojaat Holati Tavsifi:
              </p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-foreground/90 font-medium">
                {statusInfo.description}
              </p>
            </div>
          </div>

          {/* Admin Reply Card if present */}
          {result.adminReply && (
            <div className="rounded-xl border border-blue-200 bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span>💬 Admin Javobi (Mas'ul xodim munosabati):</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-medium pl-6 border-l-2 border-blue-500">
                {result.adminReply}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
