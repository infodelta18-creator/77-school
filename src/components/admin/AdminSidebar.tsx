import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Newspaper,
  Megaphone,
  Image as ImageIcon,
  FileText,
  Inbox,
  MessageSquare,
  School,
  UserCheck,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type NavItem = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Boshqaruv paneli", to: "/admin", icon: LayoutDashboard },
  { label: "Rahbariyat", to: "/admin/leadership", icon: Users },
  { label: "O'qituvchilar", to: "/admin/teachers", icon: GraduationCap },
  { label: "Yangiliklar", to: "/admin/news", icon: Newspaper },
  { label: "E'lonlar", to: "/admin/announcements", icon: Megaphone },
  { label: "Galereya & Video", to: "/admin/gallery", icon: ImageIcon },
  { label: "Hujjatlar", to: "/admin/documents", icon: FileText },
  { label: "Virtual qabulxona", to: "/admin/reception", icon: Inbox },
  { label: "Aloqa murojaatlari", to: "/admin/messages", icon: MessageSquare },
  { label: "Maktab haqida", to: "/admin/about", icon: School },
  { label: "Administratorlar", to: "/admin/users", icon: UserCheck },
  { label: "Sozlamalar", to: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  return (
    <aside className="w-72 shrink-0 bg-[#0B0F19] text-slate-300 border-r border-slate-800/60 flex flex-col min-h-screen select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/60 flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-white tracking-wide">
            Admin Panel
          </h2>
          <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase">
            215-sonli Maktab
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
        <div>
          <div className="px-3 mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Asosiy Menyu
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === "/admin"
                  ? currentPath === "/admin" || currentPath === "/admin/"
                  : currentPath.startsWith(item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-600/30 ring-1 ring-white/10"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Profile / Sign Out */}
      <div className="p-4 border-t border-slate-800/60 bg-[#080B13]">
        <div className="flex items-center justify-between rounded-xl bg-slate-900/80 p-3 border border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-950 border border-blue-700/50 flex items-center justify-center text-blue-400 font-bold text-xs">
              <ShieldCheck className="h-5 w-5 text-blue-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-100 truncate">Administrator</p>
              <p className="text-[11px] text-slate-400 truncate">Tizim boshqaruvchisi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Tizimdan chiqish"
            className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
