import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Users, FileText, Trophy, BookOpen, HeartHandshake, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/oquvchilar-uchun")({
  head: () => ({
    meta: [
        { title: "O‘quvchilar uchun | 215-sonli maktab" },
      { name: "description", content: "O‘quvchilar uchun dars jadvali, to‘garaklar, imtihonlar va foydali resurslar." },
    ],
  }),
  component: Students,
});

type StudentPageItem = {
  id: string;
  title: string;
  text: string;
  icon_name: string;
  file_url: string | null;
  file_name: string | null;
  sort_order: number;
};

const defaultItems = [
  { title: "Dars jadvali", text: "Barcha sinflar uchun haftalik dars jadvali.", icon_name: "CalendarClock" },
  { title: "Fan to‘garaklari", text: "Matematika, IT, tillar va boshqa to‘garaklar.", icon_name: "Users" },
  { title: "Imtihonlar", text: "Yakuniy nazorat ishlari va DTM imtihonlari.", icon_name: "FileText" },
  { title: "Olimpiadalar", text: "Fan olimpiadalari va tanlovlar to‘g‘risida ma’lumot.", icon_name: "Trophy" },
  { title: "Kutubxona", text: "Elektron va bosma kitoblar katalogi.", icon_name: "BookOpen" },
  { title: "Foydali resurslar", text: "Onlayn ta’lim platformalari va materiallar.", icon_name: "Sparkles" },
  { title: "Maktab qoidalari", text: "Ichki tartib qoidalari va o‘quvchi majburiyatlari.", icon_name: "ShieldCheck" },
  { title: "Psixolog maslahati", text: "Maktab psixologi bilan bepul uchrashuvlar.", icon_name: "HeartHandshake" },
] as const;

const ICONS: Record<string, LucideIcon> = {
  CalendarClock,
  Users,
  FileText,
  Trophy,
  BookOpen,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
};

function Students() {
  const [items, setItems] = useState<StudentPageItem[]>(() =>
    defaultItems.map((item, index) => ({ id: `default-${index}`, ...item, sort_order: index })),
  );

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      const { data, error } = await supabase
        .from("students_page_content")
        .select("id, title, text, icon_name, file_url, file_name, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!mounted || error) {
        return;
      }

      if ((data ?? []).length > 0) {
        setItems((data ?? []) as StudentPageItem[]);
      }
    }

    loadItems();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteLayout>
      <PageHeader
        title="O‘quvchilar uchun"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "O‘quvchilar uchun" }]}
        description="Ta’lim jarayonida sizga yordam beradigan barcha foydali ma’lumotlar bir joyda."
      />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = ICONS[item.icon_name] ?? CalendarClock;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!item.file_url) {
                    return;
                  }
                  window.open(item.file_url, "_blank", "noopener,noreferrer");
                }}
                className="rounded-md border border-border bg-background p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!item.file_url}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.text}</p>
                {item.file_url ? (
                  <p className="mt-3 text-xs font-medium text-primary">{item.file_name ?? "Hujjat mavjud"}</p>
                ) : (
                  <p className="mt-3 text-xs font-medium text-muted-foreground">Hujjat hali yuklanmagan.</p>
                )}
              </button>
            );
          })}
        </div>
      </Section>
    </SiteLayout>
  );
}
