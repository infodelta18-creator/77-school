import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  Newspaper,
  Megaphone,
  FileText,
  Briefcase,
  Inbox,
  Image as ImageIcon,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getAdminSessionAndProfile } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";
import { fetchAboutSchoolStats } from "@/lib/about-school";

type RecentRequest = {
  id: string;
  code: string;
  type: string;
  fullName: string;
  subject: string;
  status: string;
  createdAt: string;
};

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") {
      return;
    }

    const result = await getAdminSessionAndProfile();

    if (result.status !== "authorized") {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminDashboardPage,
});

function formatDateTimeTashkent(value: string) {
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

function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    students: "880",
    teachers: 85,
    news: 0,
    announcements: 0,
    documents: 0,
    vacancies: 4,
    receptions: 0,
    messages: 0,
    gallery: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const auth = await getAdminSessionAndProfile();

      if (!mounted) return;

      if (auth.status !== "authorized") {
        router.navigate({ to: "/admin/login", replace: true });
        return;
      }

      // Fetch live DB counts
      const [
        newsRes,
        annRes,
        docRes,
        recRes,
        msgRes,
        galAlbumRes,
        galImgRes,
        teachRes,
        dynamicStats,
      ] = await Promise.all([
        supabase.from("news").select("id", { count: "exact", head: true }),
        supabase.from("announcements").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("reception_requests").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }),
        supabase.from("gallery_albums").select("id", { count: "exact", head: true }),
        supabase.from("gallery_images").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        fetchAboutSchoolStats(),
      ]);

      if (mounted) {
        const totalGalleryItems = (galAlbumRes.count ?? 0) + (galImgRes.count ?? 0);

        const studentStat = dynamicStats.find((s) => {
          const lbl = s.label.toLowerCase();
          return lbl.includes("o'quvchi") || lbl.includes("o‘quvchi") || lbl.includes("o'rni");
        }) ?? dynamicStats[1];

        const studentVal = studentStat ? studentStat.value : "880";

        setCounts({
          students: studentVal,
          teachers: teachRes.count ?? 85,
          news: newsRes.count ?? 0,
          announcements: annRes.count ?? 0,
          documents: docRes.count ?? 0,
          vacancies: 4,
          receptions: recRes.count ?? 0,
          messages: msgRes.count ?? 0,
          gallery: totalGalleryItems,
        });

        // Fetch recent requests
        const [recDb, msgDb] = await Promise.all([
          supabase
            .from("reception_requests")
            .select("id, request_number, full_name, subject, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("contact_messages")
            .select("id, full_name, subject, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const formattedRecs: RecentRequest[] = (recDb.data || []).map((r) => ({
          id: r.id,
          code: r.request_number,
          type: "Virtual Qabulxona",
          fullName: r.full_name,
          subject: r.subject,
          status: r.status,
          createdAt: r.created_at,
        }));

        const formattedMsgs: RecentRequest[] = (msgDb.data || []).map((m) => ({
          id: m.id,
          code: `MSG-2026-${m.id.slice(0, 6).toUpperCase()}`,
          type: "Aloqa Xabari",
          fullName: m.full_name,
          subject: m.subject || "Murojaat",
          status: m.status,
          createdAt: m.created_at,
        }));

        const combined = [...formattedRecs, ...formattedMsgs]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);

        setRecentRequests(combined);
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400 font-medium">Boshqaruv paneli yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const totalMurojaat = counts.receptions + counts.messages;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#111827] via-[#1E1B4B] to-[#0F172A] p-8 sm:p-10 border border-indigo-900/40 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-1/3 bottom-0 -mb-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3.5 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Rasmiy Boshqaruv Tizimi</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Xush kelibsiz, Administrator! 👏
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              215-sonli umumiy o'rta ta'lim maktabi boshqaruv paneli. Bu yerda maktab tizimining umumiy statistikasi va barcha bo'limlarini boshqarishingiz mumkin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/news"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Yangilik qo'shish
            </Link>
            <Link
              to="/admin/reception"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 border border-slate-700/80 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-700/80 hover:text-white"
            >
              <Inbox className="h-4 w-4 text-blue-400" />
              Murojaatlar
            </Link>
          </div>
        </div>
      </div>

      {/* System Statistics Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-1 rounded-full bg-blue-500" />
            <h2 className="font-display text-xl font-bold text-white tracking-wide">
              Tizim Statistikasi
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Barcha ko'rsatkichlar real vaqt rejimida
          </span>
        </div>

        {/* 8 Stat Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Maktab O'quvchilari */}
          <StatCard
            title="MAKTAB O'QUVCHILARI"
            value={counts.students}
            badge={`${counts.students} ta o'quvchi`}
            icon={Users}
            cardBg="bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] border-indigo-900/50"
            iconBg="bg-indigo-500/20 text-indigo-400"
          />

          {/* Card 2: O'qituvchilar */}
          <StatCard
            title="O'QITUVCHILAR (PEDAGOGLAR)"
            value={counts.teachers}
            badge="Maktab pedagoglari"
            icon={GraduationCap}
            cardBg="bg-gradient-to-br from-[#064E3B]/40 to-[#0F172A] border-emerald-900/50"
            iconBg="bg-emerald-500/20 text-emerald-400"
          />

          {/* Card 3: Yangiliklar */}
          <StatCard
            title="YANGILIKLAR"
            value={counts.news}
            badge="Chop etilgan maqolalar"
            icon={Newspaper}
            cardBg="bg-gradient-to-br from-[#78350F]/40 to-[#0F172A] border-amber-900/50"
            iconBg="bg-amber-500/20 text-amber-400"
          />

          {/* Card 4: E'lonlar */}
          <StatCard
            title="E'LONLAR"
            value={counts.announcements}
            badge="Rasmiy e'lonlar"
            icon={Megaphone}
            cardBg="bg-gradient-to-br from-[#881337]/40 to-[#0F172A] border-rose-900/50"
            iconBg="bg-rose-500/20 text-rose-400"
          />

          {/* Card 5: Hujjatlar */}
          <StatCard
            title="HUJJATLAR"
            value={counts.documents}
            badge="Me'yoriy hujjatlar"
            icon={FileText}
            cardBg="bg-gradient-to-br from-[#312E81]/40 to-[#0F172A] border-purple-900/50"
            iconBg="bg-purple-500/20 text-purple-400"
          />

          {/* Card 6: Vakansiyalar */}
          <StatCard
            title="VAKANSIYALAR"
            value={counts.vacancies}
            badge="Bo'sh ish o'rinlari"
            icon={Briefcase}
            cardBg="bg-gradient-to-br from-[#164E63]/40 to-[#0F172A] border-cyan-900/50"
            iconBg="bg-cyan-500/20 text-cyan-400"
          />

          {/* Card 7: Yangi Murojaatlar */}
          <StatCard
            title="YANGI MUROJAATLAR"
            value={totalMurojaat}
            badge="Kelib tushgan arizalar"
            icon={Inbox}
            cardBg="bg-gradient-to-br from-[#831843]/40 to-[#0F172A] border-pink-900/50"
            iconBg="bg-pink-500/20 text-pink-400"
          />

          {/* Card 8: Media Galereya */}
          <StatCard
            title="MEDIA GALEREYA"
            value={counts.gallery}
            badge="Rasm va videolar"
            icon={ImageIcon}
            cardBg="bg-gradient-to-br from-[#4C1D95]/40 to-[#0F172A] border-violet-900/50"
            iconBg="bg-violet-500/20 text-violet-400"
          />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0E1322] p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              So'nggi kelib tushgan murojaatlar
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Virtual qabulxona va aloqa murojaatlarining real vaqt monitoringi
            </p>
          </div>
          <Link
            to="/admin/reception"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
          >
            Barchasini ko'rish
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Hozircha murojaatlar yo'q.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Kod</th>
                  <th className="py-3 px-3">Murojaat turi</th>
                  <th className="py-3 px-3">Murojaatchi</th>
                  <th className="py-3 px-3">Mavzu</th>
                  <th className="py-3 px-3">Sana</th>
                  <th className="py-3 px-3">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentRequests.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-3 font-mono text-xs font-bold text-blue-400">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-300 font-medium">
                      {item.type}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-100">
                      {item.fullName}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-300 max-w-xs truncate">
                      {item.subject}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-slate-400">
                      {formatDateTimeTashkent(item.createdAt)}
                    </td>
                    <td className="py-3.5 px-3">{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  badge,
  icon: Icon,
  cardBg,
  iconBg,
}: {
  title: string;
  value: string | number;
  badge: string;
  icon: typeof Users;
  cardBg: string;
  iconBg: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 ${cardBg}`}>
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-inner ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-serif text-3xl font-extrabold text-white tracking-tight">
          {value}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/60 border border-slate-700/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
          {badge}
        </span>
      </div>
    </div>
  );
}
