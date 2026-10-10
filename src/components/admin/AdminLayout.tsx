import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#090D16] text-slate-100 font-sans antialiased">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto min-w-0 p-6 sm:p-10 bg-[#090D16] text-slate-100">
        {children}
      </main>
    </div>
  );
}
