import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, Mail, Clock, UserCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";
import { LEADERSHIP_SELECT, leadershipInitials, type LeadershipRow } from "@/lib/leadership";

export const Route = createFileRoute("/rahbariyat")({
  head: () => ({
    meta: [
      { title: "Rahbariyat | 215-sonli maktab" },
      { name: "description", content: "215-sonli maktab rahbariyati, direktor va direktor o‘rinbosarlari haqida ma’lumot." },
    ],
  }),
  component: Leadership,
});

function Leadership() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [leaders, setLeaders] = useState<LeadershipRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadLeadership() {
      const { data, error: fetchError } = await supabase
        .from("leadership")
        .select(LEADERSHIP_SELECT)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!mounted) {
        return;
      }

      if (fetchError) {
        setError("Rahbariyat ma'lumotlarini yuklab bo'lmadi.");
        setLeaders([]);
        setLoading(false);
        return;
      }

      setLeaders((data ?? []) as LeadershipRow[]);
      setLoading(false);
    }

    loadLeadership();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteLayout>
      <PageHeader
        title="Maktab Rahbariyati"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Rahbariyat" }]}
        description="215-sonli umumiy o‘rta ta’lim maktabi rahbariyati bilan tanishing va qabul kunlariga yoziling."
      />
      <Section eyebrow="Rasmiy Boshqaruv" title="Maktab Rahbarlari">
        {loading ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted p-12 text-center text-sm text-muted-foreground">
            Yuklanmoqda...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted p-12 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : leaders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface-muted p-12 text-center text-sm text-muted-foreground">
            Hozircha rahbariyat ma'lumotlari mavjud emas.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Leadership Cards List with Executive Portrait Frames */}
            <div className="grid gap-8 lg:grid-cols-2">
              {leaders.map((l) => {
                const isDirector = l.position.toLowerCase().includes("direktor") && !l.position.toLowerCase().includes("o'rinbosari");

                return (
                  <article
                    key={l.id}
                    className={`group flex flex-col sm:flex-row overflow-hidden rounded-2xl border bg-background shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated ${
                      isDirector
                        ? "border-primary/40 ring-1 ring-primary/20 border-t-4 border-t-gold"
                        : "border-border border-t-4 border-t-primary"
                    }`}
                  >
                    {/* Executive Portrait Frame Container */}
                    <div className="relative flex-shrink-0 flex items-center justify-center p-6 bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-200/40 border-b sm:border-b-0 sm:border-r border-border/60">
                      {/* Institutional Gold Frame */}
                      <div className="relative h-48 w-40 overflow-hidden rounded-xl border-2 border-gold/70 shadow-lg ring-4 ring-primary-dark/10 group-hover:ring-primary/20 transition-all duration-500 bg-slate-900">
                        {l.photo_url ? (
                          <img
                            src={l.photo_url}
                            alt={l.full_name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-dark to-primary text-3xl font-bold text-white">
                            {leadershipInitials(l.full_name)}
                          </div>
                        )}
                        {/* Gold Badge Overlay */}
                        <div className="absolute top-2 right-2 rounded-full bg-gold/95 p-1 text-primary-dark shadow">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Executive Details Container */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {/* Position Badge */}
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                          <UserCheck className="h-3.5 w-3.5" />
                          {l.position}
                        </div>

                        {/* Leader Full Name */}
                        <h3 className="mt-2.5 font-display text-xl font-bold text-primary-dark sm:text-2xl">
                          {l.full_name}
                        </h3>

                        {/* Biography / Description */}
                        {l.biography && (
                          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {l.biography}
                          </p>
                        )}
                      </div>

                      {/* Contact & Reception Info Chips */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {l.reception_days && (
                          <div className="flex items-center gap-2 rounded-lg bg-blue-50/70 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-primary-dark">
                            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                            <span>Qabul kunlari: {l.reception_days}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {l.phone && (
                            <a
                              href={`tel:${l.phone}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition"
                            >
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              {l.phone}
                            </a>
                          )}

                          {l.email && (
                            <a
                              href={`mailto:${l.email}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition"
                            >
                              <Mail className="h-3.5 w-3.5 text-primary" />
                              {l.email}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Virtual Reception CTA Box */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-dark to-primary p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="font-display text-xl font-bold">Virtual qabulxona orqali murojaat yuboring</h3>
                <p className="text-sm text-white/80 max-w-xl">
                  Maktab rahbariyatiga to'g'ridan-to'g mehmonga yozilish yoki rasmiy murojaat qoldirish uchun onlayn xizmatdan foydalaning.
                </p>
              </div>
              <Link
                to="/virtual-qabulxona"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-primary-dark shadow-md transition hover:bg-gold/90 hover:scale-105 flex-shrink-0"
              >
                Murojaat yuborish <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </Section>
    </SiteLayout>
  );
}
