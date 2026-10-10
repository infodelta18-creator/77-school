import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  GraduationCap,
  CalendarClock,
  FileText,
  Users,
  Mails,
  Phone,
  AlertCircle,
  ArrowRight,
  MapPin,
  Mail,
  Clock,
  Trophy,
  ExternalLink,
  X,
  Play,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Hero } from "@/components/site/Hero";
import { Section } from "@/components/site/Section";
import { Counter } from "@/components/site/Counter";
import {
  quickAccess,
  stats,
  achievements,
  usefulLinks,
} from "@/lib/demo-data";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useLanguage } from "@/lib/language";
import { supabase } from "@/lib/supabase";
import { TEACHERS_SELECT, teacherInitials, type TeacherRow } from "@/lib/teachers";
import { LEADERSHIP_SELECT, leadershipInitials, type LeadershipRow } from "@/lib/leadership";
import { formatDateDDMMYYYY } from "@/lib/date-format";
import { isYouTubeUrl, getYouTubeThumbnail } from "@/lib/youtube";
import {
  DEFAULT_DYNAMIC_STATS,
  fetchAboutSchoolStats,
  type AboutSchoolStatRow,
} from "@/lib/about-school";

const ICONS = { GraduationCap, CalendarClock, FileText, Users, Mails, Phone };

type HomeNewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
};

type HomeGalleryImage = {
  id: string;
  image_url: string;
  created_at: string;
};

function getAchievementAudience(value: string) {
  if (/maktab\s+jamoasi/i.test(value)) {
    return "Maktab jamoasi";
  }

  const classMatch = value.match(/(\d+)\s*-\s*sinf/i);
  if (classMatch?.[1]) {
    return `${classMatch[1]}-sinf`;
  }

  return "Maktab jamoasi";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "215-sonli umumiy o‘rta ta’lim maktabi | Rasmiy sayt" },
      {
        name: "description",
        content:
          "215-sonli umumiy o‘rta ta’lim maktabining rasmiy sayti. Toshkent shahri. Yangiliklar, e’lonlar, o‘qituvchilar va qabul jarayoni haqida ma’lumot.",
      },
      { property: "og:title", content: "215-sonli umumiy o‘rta ta’lim maktabi" },
      {
        property: "og:description",
        content: "Toshkent shahridagi 215-sonli maktabning rasmiy sayti.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { settings } = useSiteSettings();
  const { t } = useLanguage();
  const [homeTeachers, setHomeTeachers] = useState<TeacherRow[]>([]);
  const [homeNews, setHomeNews] = useState<HomeNewsItem[]>([]);
  const [director, setDirector] = useState<LeadershipRow | null>(null);
  const [homeGalleryImages, setHomeGalleryImages] = useState<HomeGalleryImage[]>([]);
  const [galleryLightbox, setGalleryLightbox] = useState<string | null>(null);
  const [homeStats, setHomeStats] = useState<AboutSchoolStatRow[]>(DEFAULT_DYNAMIC_STATS);

  useEffect(() => {
    let mounted = true;

    async function loadDynamicStats() {
      const data = await fetchAboutSchoolStats();
      if (mounted && data && data.length > 0) {
        setHomeStats(data);
      }
    }

    void loadDynamicStats();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTeachers() {
      const { data, error } = await supabase
        .from("teachers")
        .select(TEACHERS_SELECT)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!mounted || error) {
        return;
      }

      const rows = (data ?? []) as TeacherRow[];
      const featured = rows.filter((item) => item.is_featured);
      const featuredIds = new Set(featured.map((item) => item.id));
      const others = rows.filter((item) => !featuredIds.has(item.id));
      setHomeTeachers([...featured, ...others].slice(0, 4));
    }

    loadTeachers();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadHomeGalleryImages() {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("id, image_url, created_at")
        .order("created_at", { ascending: false })
        .limit(6);

      if (!mounted || error) {
        setHomeGalleryImages([]);
        return;
      }

      setHomeGalleryImages((data ?? []) as HomeGalleryImage[]);
    }

    void loadHomeGalleryImages();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDirector() {
      const { data, error } = await supabase
        .from("leadership")
        .select(LEADERSHIP_SELECT)
        .eq("is_active", true)
        .ilike("position", "Direktor")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);

      if (!mounted || error) {
        setDirector(null);
        return;
      }

      setDirector(((data ?? [])[0] as LeadershipRow | undefined) ?? null);
    }

    void loadDirector();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadHomeNews() {
      const { data, error } = await supabase
        .from("news")
        .select("id, title, slug, excerpt, featured_image, published_at, created_at, news_categories(name)")
        .eq("status", "published")
        .not("featured_image", "is", null)
        .neq("featured_image", "")
        .order("created_at", { ascending: false })
        .limit(2);

      if (!mounted || error) {
        setHomeNews([]);
        return;
      }

      const mapped = (data ?? [])
        .filter((item) => Boolean(item.featured_image?.trim()))
        .map((item) => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          excerpt: item.excerpt ?? "",
          image: item.featured_image ?? "",
          date: item.published_at ?? item.created_at,
          category: item.news_categories?.[0]?.name ?? "Yangilik",
        })) as HomeNewsItem[];

      setHomeNews(mapped);
    }

    void loadHomeNews();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SiteLayout>
      <Hero />

      {/* Announcement bar */}
      <div className="border-y border-gold/40 bg-gold/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-3 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-foreground">
              <AlertCircle className="h-3 w-3" />
              {t("home.announcement.badge")}
            </span>
            <span className="text-sm text-foreground">
              {t("home.announcement.text")}
            </span>
          </div>
          <Link
            to="/elonlar"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            {t("home.announcement.cta")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick access */}
      <Section eyebrow={t("home.quickAccess.eyebrow")} title={t("home.quickAccess.title")} muted>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {quickAccess.map((q) => {
            const Icon = ICONS[q.icon as keyof typeof ICONS];
            return (
              <Link
                key={q.title}
                to={q.href}
                className="group flex flex-col items-start gap-3 rounded-md border border-border bg-background p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{q.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{q.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Dynamic Stats */}
      <section className="relative bg-primary-dark py-14 text-white md:py-16">
        <div className="container-page grid grid-cols-2 gap-6 md:grid-cols-4">
          {homeStats.slice(0, 4).map((s) => {
            const numValue = Number.parseInt(s.value.replace(/\D/g, ""), 10);
            const isNumeric = Number.isFinite(numValue) && numValue > 0;
            const suffix = s.value.replace(/[0-9]/g, "");

            return (
              <div key={s.id || s.label} className="border-l-2 border-gold/70 pl-4">
                <div className="font-display text-4xl font-bold md:text-5xl">
                  {isNumeric ? <Counter value={numValue} suffix={suffix} /> : s.value}
                </div>
                <div className="mt-1.5 text-sm text-white/70">{s.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* News */}
      <Section
        eyebrow={t("home.news.eyebrow")}
        title={t("home.news.title")}
        action={
          <Link
            to="/yangiliklar"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            {t("home.news.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        {homeNews.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {homeNews.map((newsItem) => (
              <Link
                key={newsItem.id}
                to="/yangiliklar/$slug"
                params={{ slug: newsItem.slug }}
                className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-background shadow-card transition hover:shadow-elevated"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={newsItem.image}
                    alt={newsItem.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-sm bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                      {newsItem.category}
                    </span>
                    <span className="text-muted-foreground">{formatDateDDMMYYYY(newsItem.date)}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-xl font-bold leading-snug text-foreground group-hover:text-primary md:text-2xl">
                    {newsItem.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {newsItem.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Hozircha chop etilgan yangiliklar yo‘q.</p>
          </div>
        )}
      </Section>

      {/* Executive Principal Message Section */}
      <section className="bg-surface-muted py-14 md:py-20 border-y border-border/60">
        <div className="container-page grid gap-10 lg:grid-cols-12 lg:items-center">
          {/* 45% Executive Image Frame */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm sm:max-w-md">
              {/* Dark Navy Offset Backdrop Layer */}
              <div className="absolute -bottom-3 -right-3 inset-0 rounded-2xl bg-primary-dark/15 border border-primary-dark/10 pointer-events-none" />

              {/* Executive Portrait Card (4:5 aspect ratio) */}
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-white/80 bg-slate-900 shadow-xl ring-1 ring-black/5 transition duration-300 hover:scale-[1.015]">
                {director?.photo_url ? (
                  <img
                    src={director.photo_url}
                    alt={director.full_name}
                    className="h-full w-full object-cover transition duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-dark to-primary text-5xl font-bold text-white">
                    {director?.full_name ? leadershipInitials(director.full_name) : "D"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 55% Text Block */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <div className="text-xs uppercase font-bold tracking-widest text-primary">
                {t("home.principal.eyebrow")}
              </div>
              <h2 className="mt-1.5 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary-dark tracking-tight">
                {t("home.principal.title")}
              </h2>
              <div className="mt-2.5 h-1 w-14 bg-amber-500 rounded-full" />
            </div>

            <blockquote className="border-l-2 border-gold pl-5 text-[15px] leading-relaxed text-foreground/85 font-normal py-1">
              {director?.biography ?? t("home.principal.quote")}
            </blockquote>

            <div className="pt-1">
              <div className="font-display text-lg font-bold text-primary-dark">
                {director?.full_name ?? "Raximova Noila Shukurovna"}
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                {director?.position ?? "Direktor"}
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/rahbariyat"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition duration-200 hover:bg-primary-dark hover:shadow-lg"
              >
                {t("home.principal.cta")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Teachers preview */}
      <Section
        eyebrow={t("home.teachers.eyebrow")}
        title={t("home.teachers.title")}
        description={t("home.teachers.description")}
        muted
        action={
          <Link
            to="/oqituvchilar"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            {t("home.teachers.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {homeTeachers.map((t) => (
            <div
              key={t.id}
              className="overflow-hidden rounded-md border border-border bg-background shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="aspect-[4/5] bg-gradient-to-br from-primary/10 to-primary/5">
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
                <p className="mt-1 text-sm text-primary">{t.subject ?? "Fan ko'rsatilmagan"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{t.experience_years ?? 0} yil tajriba</span>
                  <span className="text-border">•</span>
                  <span className="rounded-sm bg-gold/15 px-1.5 py-0.5 font-medium text-gold-foreground">
                    {t.qualification ?? "Toifa ko'rsatilmagan"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Achievements */}
      <Section eyebrow={t("home.achievements.eyebrow")} title={t("home.achievements.title")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {achievements.map((a, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-md border border-border bg-background p-5 shadow-card"
            >
              <div className="absolute right-3 top-3 text-[11px] font-semibold text-muted-foreground">
                {a.year}
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-gold/15 text-gold">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{a.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
              <div className="mt-3 border-t border-border pt-3 text-xs text-foreground/70">
                {getAchievementAudience(a.who)}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Gallery preview */}
      <Section
        eyebrow={t("home.gallery.eyebrow")}
        title={t("home.gallery.title")}
        muted
        action={
          <Link
            to="/galereya"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
          >
            {t("home.gallery.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        }
      >
        {homeGalleryImages.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Hozircha galereyada rasmlar mavjud emas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {homeGalleryImages.map((image) => {
              const isVideo = isYouTubeUrl(image.image_url);
              const displayUrl = isVideo ? getYouTubeThumbnail(image.image_url) : image.image_url;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => {
                    if (isVideo) {
                      window.open(image.image_url, "_blank", "noopener,noreferrer");
                    } else {
                      setGalleryLightbox(image.image_url);
                    }
                  }}
                  className="group relative aspect-[4/3] overflow-hidden rounded-md bg-slate-800"
                >
                  <img
                    src={displayUrl}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/hero-classroom.jpg";
                    }}
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 text-white shadow-lg transition group-hover:scale-110">
                        <Play className="h-6 w-6 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary-dark/0 transition group-hover:bg-primary-dark/30" />
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Useful links */}
      <Section eyebrow={t("home.links.eyebrow")} title={t("home.links.title")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {usefulLinks.map((l) => (
            <a
              key={l.title}
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-start justify-between gap-3 rounded-md border border-border bg-background p-5 shadow-card transition hover:border-primary/50 hover:shadow-elevated"
            >
              <div>
                <div className="font-semibold text-foreground group-hover:text-primary">
                  {l.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{l.desc}</div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </a>
          ))}
        </div>
      </Section>

      {/* Contact + Map */}
      <Section muted>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="section-eyebrow">{t("home.contact.eyebrow")}</div>
            <h2 className="section-title mt-2 relative pb-3">
              {t("home.contact.title")}
              <span className="absolute left-0 bottom-0 h-0.5 w-12 bg-gold" />
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                { icon: MapPin, label: t("home.contact.address"), value: settings.address },
                { icon: Phone, label: t("home.contact.phone"), value: settings.phone },
                { icon: Mail, label: t("home.contact.email"), value: settings.email },
                { icon: Clock, label: t("home.contact.workingHours"), value: settings.workingHours },
              ].map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex gap-4 rounded-md border border-border bg-background p-4">
                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-0.5 font-semibold text-foreground">{value}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={`tel:${settings.phone}`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary-dark"
              >
                <Phone className="h-4 w-4" /> {t("home.contact.callNow")}
              </a>
              {settings.mapDirectionsUrl ? (
                <a
                  href={settings.mapDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50"
                >
                  <MapPin className="h-4 w-4" /> {t("home.contact.getDirections")}
                </a>
              ) : null}
            </div>
          </div>
          <div className="min-h-[360px] overflow-hidden rounded-md border border-border shadow-card">
            <iframe
              title="Xarita"
              src={settings.mapEmbedUrl}
              className="h-full min-h-[360px] w-full"
              loading="lazy"
            />
          </div>
        </div>
      </Section>

      {galleryLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/90 p-4"
          onClick={() => setGalleryLightbox(null)}
        >
          <button
            onClick={() => setGalleryLightbox(null)}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={galleryLightbox} alt="" className="max-h-[85vh] max-w-full rounded-md object-contain" />
        </div>
      )}
    </SiteLayout>
  );
}
