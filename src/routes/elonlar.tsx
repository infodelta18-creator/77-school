import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/elonlar")({
  head: () => ({
    meta: [
      { title: "E’lonlar | 215-sonli maktab" },
      { name: "description", content: "Maktab rasmiy e’lonlari va muhim xabarnomalar." },
    ],
  }),
  component: Announcements,
});

function Announcements() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<AnnouncementItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadAnnouncements() {
      setLoading(true);
      setError("");

      const nowIso = new Date().toISOString();
      const { data, error: fetchError } = await supabase
        .from("announcements")
        .select("id, title, content, importance, start_date, expiration_date, created_at")
        .eq("status", "published")
        .or(`start_date.is.null,start_date.lte.${nowIso}`)
        .or(`expiration_date.is.null,expiration_date.gte.${nowIso}`)
        .order("importance", { ascending: false })
        .order("start_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (!mounted) {
        return;
      }

      if (fetchError) {
        setError("E'lonlarni yuklab bo'lmadi.");
        setItems([]);
        setLoading(false);
        return;
      }

      setItems((data ?? []) as AnnouncementItem[]);
      setLoading(false);
    }

    loadAnnouncements();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        if (!item.expiration_date) {
          return true;
        }

        const nowMs = Date.now();
        const expirationMs = new Date(item.expiration_date).getTime();
        if (Number.isNaN(expirationMs)) {
          return true;
        }
        return expirationMs >= nowMs;
      }),
    [items],
  );

  return (
    <SiteLayout>
      <PageHeader
        title="E’lonlar"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "E’lonlar" }]}
        description="Maktab tomonidan e’lon qilingan rasmiy xabarlar va muhim ma’lumotlar."
      />
      <Section>
        {loading ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          </div>
        ) : error ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Hozircha e'lonlar yo'q.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {visibleItems.map((item) => {
              const dateValue = item.start_date ?? item.created_at;
              const [year = "", month = "", day = ""] = dateValue.split("T")[0]?.split("-") ?? [];
              const dateText = year && month && day ? `${day}.${month}.${year}` : dateValue;

              return (
                <li key={item.id} className="flex flex-col gap-4 rounded-md border border-border bg-background p-5 shadow-card sm:flex-row">
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <div className="text-2xl font-bold leading-none">{day || "--"}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-white/80">{month && year ? `${month}.${year}` : "-"}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`rounded-sm px-1.5 py-0.5 font-semibold uppercase tracking-wider ${
                          item.importance === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : item.importance === "important"
                              ? "bg-gold/20 text-gold-foreground"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {item.importance === "critical"
                          ? "Juda muhim"
                          : item.importance === "important"
                            ? "Muhim"
                            : "Oddiy"}
                      </span>
                      <span className="text-muted-foreground">{dateText}</span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold text-foreground">{item.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{item.content}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </SiteLayout>
  );
}

type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  importance: "normal" | "important" | "critical";
  start_date: string | null;
  expiration_date: string | null;
  created_at: string;
};
