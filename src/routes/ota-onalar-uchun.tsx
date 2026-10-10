import { createFileRoute, Link } from "@tanstack/react-router";
import { UserCheck, ClipboardList, FileText, Users, HelpCircle, Shirt, ShieldCheck, MessageSquare, ChevronDown, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/ota-onalar-uchun")({
  head: () => ({
    meta: [
      { title: "Ota-onalar uchun | 215-sonli maktab" },
      { name: "description", content: "Ota-onalar uchun qabul tartibi, kerakli hujjatlar va tez-tez so‘raladigan savollar." },
    ],
  }),
  component: Parents,
});

type ParentPageItem = {
  id: string;
  title: string;
  text: string;
  icon_name: string;
  file_url: string | null;
  file_name: string | null;
  sort_order: number;
};

function normalizeParentTitle(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02bc`]/g, "'");
}

const defaultItems = [
  { title: "Ota-onalar uchun qo‘llanma", text: "Ta’lim jarayonida ota-ona sifatida siz bilishingiz kerak bo‘lgan ma’lumotlar.", icon_name: "UserCheck" },
  { title: "Qabul tartibi", text: "1-sinfga qabul jarayoni va bosqichlari haqida to‘liq ma’lumot.", icon_name: "ClipboardList" },
  { title: "Kerakli hujjatlar", text: "Qabul uchun taqdim etilishi zarur bo‘lgan hujjatlar ro‘yxati.", icon_name: "FileText" },
  { title: "Ota-onalar yig‘ilishi", text: "Yig‘ilishlar jadvali va kun tartibi.", icon_name: "Users" },
  { title: "Maktab formasi", text: "Rasmiy maktab formasi talablari va tavsiyalar.", icon_name: "Shirt" },
  { title: "Bolalar xavfsizligi", text: "Bola xavfsizligi bo‘yicha maslahatlar va qoidalar.", icon_name: "ShieldCheck" },
] as const;

const ICONS: Record<string, LucideIcon> = {
  UserCheck,
  ClipboardList,
  FileText,
  Users,
  Shirt,
  ShieldCheck,
};

const FAQ = [
  { q: "1-sinfga qanday hujjatlar topshirish kerak?", a: "Bolaning tug‘ilganlik guvohnomasi nusxasi, tibbiy karta, 3x4 rasmlar (4 dona) va ota-onaning shaxsiy hujjati nusxasi." },
  { q: "Qabul qachon boshlanadi?", a: "1-sinfga qabul har yili 1-iyundan 20-avgustgacha davom etadi. Aniq muddatlar rasmiy e’lonlar orqali ma’lum qilinadi." },
  { q: "Maktab formasi majburiymi?", a: "Ha, o‘rnatilgan tartibda maktab formasi barcha o‘quvchilar uchun majburiy hisoblanadi." },
  { q: "Bola kasal bo‘lsa, qanday xabar qilinadi?", a: "Sinf rahbariga telefon orqali xabar qilish va keyinchalik shifokor ma’lumotnomasini taqdim etish talab qilinadi." },
];

function Parents() {
  const [open, setOpen] = useState<number | null>(0);
  const [items, setItems] = useState<ParentPageItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadItems() {
      const { data, error } = await supabase
        .from("parents_page_content")
        .select("id, title, text, icon_name, file_url, file_name, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!mounted || error) {
        return;
      }

      if ((data ?? []).length > 0) {
        const rows = (data ?? []) as ParentPageItem[];
        const byKey = new Map<string, ParentPageItem>();
        for (const row of rows) {
          const key = normalizeParentTitle(row.title);
          if (!byKey.has(key)) {
            byKey.set(key, row);
          }
        }

        const merged = defaultItems
          .map((item) => byKey.get(normalizeParentTitle(item.title)))
          .filter((row): row is ParentPageItem => Boolean(row));

        setItems(merged.length > 0 ? merged : rows);
        return;
      }

      setItems(
        defaultItems.map((item, index) => ({
          id: `default-${index}`,
          ...item,
          file_url: null,
          file_name: null,
          sort_order: index,
        })),
      );
    }

    void loadItems();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteLayout>
      <PageHeader
        title="Ota-onalar uchun"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Ota-onalar uchun" }]}
        description="Farzandingiz ta’lim yo‘lida sizga yordam beradigan barcha ma’lumotlar."
      />
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon_name] ?? UserCheck;
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
          <Link
            to="/virtual-qabulxona"
            className="group flex flex-col justify-between rounded-md border border-primary bg-primary p-5 text-primary-foreground shadow-card transition hover:bg-primary-dark"
          >
            <div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/15">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">Virtual qabulxona</h3>
              <p className="mt-1.5 text-sm text-white/85">Onlayn tarzda murojaat yuboring va tezkor javob oling.</p>
            </div>
            <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-gold">Murojaat yuborish →</div>
          </Link>
        </div>
      </Section>

      <Section eyebrow="Yordam" title="Tez-tez so‘raladigan savollar" muted>
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ.map((f, i) => (
            <div key={i} className="overflow-hidden rounded-md border border-border bg-background">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  {f.q}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="border-t border-border bg-surface-muted px-5 py-4 text-sm text-foreground/80">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </SiteLayout>
  );
}
