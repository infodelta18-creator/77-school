import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";
import { TEACHERS_SELECT, teacherInitials, type TeacherRow } from "@/lib/teachers";

export const Route = createFileRoute("/oqituvchilar")({
  head: () => ({
    meta: [
      { title: "O‘qituvchilar | 215-sonli maktab" },
      { name: "description", content: "215-sonli maktab pedagoglari va o‘qituvchilar tarkibi haqida ma’lumot." },
    ],
  }),
  component: Teachers,
});

function Teachers() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("Barchasi");

  useEffect(() => {
    let mounted = true;

    async function loadTeachers() {
      const { data, error } = await supabase
        .from("teachers")
        .select(TEACHERS_SELECT)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!mounted) {
        return;
      }

      if (error) {
        setLoadError("O'qituvchilarni yuklab bo'lmadi.");
        setLoading(false);
        return;
      }

      setTeachers((data ?? []) as TeacherRow[]);
      setLoading(false);
    }

    loadTeachers();

    return () => {
      mounted = false;
    };
  }, []);

  const departments = useMemo(() => {
    const unique = new Set<string>();
    for (const teacher of teachers) {
      const value = (teacher.department ?? "").trim();
      if (value) {
        unique.add(value);
      }
    }

    return ["Barchasi", ...Array.from(unique).sort((a, b) => a.localeCompare(b, "uz"))];
  }, [teachers]);

  useEffect(() => {
    if (!departments.includes(dept)) {
      setDept("Barchasi");
    }
  }, [departments, dept]);

  const list = useMemo(
    () =>
      teachers.filter(
        (t) =>
          (dept === "Barchasi" || (t.department ?? "") === dept) &&
          (q === "" ||
            t.full_name.toLowerCase().includes(q.toLowerCase()) ||
            (t.subject ?? "").toLowerCase().includes(q.toLowerCase())),
      ),
    [teachers, q, dept],
  );

  if (loading) {
    return (
      <SiteLayout>
        <PageHeader
          title="O‘qituvchilar"
          breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "O‘qituvchilar" }]}
          description="Malakali va tajribali pedagoglarimiz jamoasi bilan tanishing."
        />
        <Section>
          <div className="rounded-md border border-border bg-surface-muted p-8 text-center text-sm text-muted-foreground">
            Yuklanmoqda...
          </div>
        </Section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        title="O‘qituvchilar"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "O‘qituvchilar" }]}
        description="Malakali va tajribali pedagoglarimiz jamoasi bilan tanishing."
      />
      <Section>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="O‘qituvchi ismi yoki fan..."
              className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  dept === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {loadError ? (
          <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t) => (
            <article
              key={t.id}
              className="overflow-hidden rounded-md border border-border bg-background shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="aspect-[4/5] bg-gradient-to-br from-primary/15 to-primary/5">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.full_name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl font-bold text-primary/30">
                    {teacherInitials(t.full_name)}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground">{t.full_name}</h3>
                <p className="mt-1 text-sm text-primary">{t.subject ?? "Fan ko'rsatilmagan"} o‘qituvchisi</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{t.experience_years ?? 0} yil tajriba</span>
                  <span className="text-border">•</span>
                  <span className="rounded-sm bg-gold/15 px-1.5 py-0.5 font-medium text-gold-foreground">
                    {t.qualification ?? "Toifa ko'rsatilmagan"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {list.length === 0 && (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center text-sm text-muted-foreground">
            Hech qanday natija topilmadi.
          </div>
        )}
      </Section>
    </SiteLayout>
  );
}
