import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Target, Eye, Building2, X } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { Counter } from "@/components/site/Counter";
import { supabase } from "@/lib/supabase";
import {
  ABOUT_SCHOOL_SELECT,
  DEFAULT_DYNAMIC_STATS,
  fetchAboutSchoolStats,
  type AboutSchoolRow,
  type AboutSchoolStatRow,
} from "@/lib/about-school";
import { getLocalizedValue, useLanguage } from "@/lib/language";
import heroSchool from "@/assets/hero-school.jpg";
import heroClassroom from "@/assets/hero-classroom.jpg";

export const Route = createFileRoute("/maktab-haqida")({
  head: () => ({
    meta: [
      { title: "Maktab haqida | 215-sonli maktab" },
      { name: "description", content: "215-sonli umumiy o‘rta ta’lim maktabining tarixi, missiyasi, qadriyatlari va moddiy-texnik bazasi." },
    ],
  }),
  component: About,
});

function About() {
  const { locale, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [about, setAbout] = useState<AboutSchoolRow | null>(null);
  const [statsList, setStatsList] = useState<AboutSchoolStatRow[]>(DEFAULT_DYNAMIC_STATS);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAboutData() {
      try {
        const [aboutRes, dynamicStats] = await Promise.all([
          supabase.from("about_school").select(ABOUT_SCHOOL_SELECT).eq("id", 1).maybeSingle(),
          fetchAboutSchoolStats(),
        ]);

        if (!mounted) return;

        if (aboutRes.data) {
          setAbout(aboutRes.data as AboutSchoolRow);
        }
        if (dynamicStats && dynamicStats.length > 0) {
          setStatsList(dynamicStats);
        }
      } catch (err) {
        console.warn("About school load warning:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAboutData();

    return () => {
      mounted = false;
    };
  }, []);

  const content = useMemo(() => {
    if (!about) {
      return {
        title: "Maktab haqida",
        intro: "215-sonli umumiy o'rta ta'lim maktabining tarixi, missiyasi va moddiy-texnik bazasi.",
        historyLabel: "TARIX",
        historyTitle: "Maktab tarixi",
        historyText:
          "215-sonli umumiy o‘rta ta’lim maktabi Toshkent shahri Yashnobod tumanida joylashgan bo‘lib, o‘tgan yillar mobaynida minglab yosh avlod vakillariga bilim va tarbiya berib kelmoqda. Maktab zamonaviy o‘quv jarayoni, malakali pedagog kadrlar hamda mustahkam moddiy-texnik baza bilan ta’minlangan. Bugungi kunda maktabimizda umumiy o‘rta ta’limning amaldagi standartlariga muvofiq ta’lim tashkil etilgan. O‘quvchilar aniq va tabiiy fanlar, xorijiy tillar, informatika hamda san’at yo‘nalishlarida chuqurlashtirilgan bilim oladilar.",
        missionTitle: "Bizning missiyamiz",
        missionText: "Har bir o'quvchida mustaqil fikrlash, zamonaviy bilim va yuksak odob-axloqni shakllantirish.",
        visionTitle: "Kelajak qarashlarimiz",
        visionText: "Xalqaro va milliy ta'lim standartlariga to'la javob beradigan zamonaviy ta'lim maskaniga aylanish.",
        mainImageUrl: "",
        secondaryImageUrl: "",
      };
    }

    return {
      title: getLocalizedValue(locale, { uz: about.title_uz, ru: about.title_ru, en: about.title_en }) || "Maktab haqida",
      intro: getLocalizedValue(locale, { uz: about.intro_uz, ru: about.intro_ru, en: about.intro_en }) || "215-sonli umumiy o'rta ta'lim maktabi tarixi va faoliyati.",
      historyLabel: getLocalizedValue(locale, { uz: about.history_label_uz, ru: about.history_label_ru, en: about.history_label_en }) || "TARIX",
      historyTitle: getLocalizedValue(locale, {
        uz: about.history_title_uz,
        ru: about.history_title_ru,
        en: about.history_title_en,
      }) || "Maktab tarixi",
      historyText:
        getLocalizedValue(locale, {
          uz: about.history_text_uz,
          ru: about.history_text_ru,
          en: about.history_text_en,
        }) || "Maktabimiz uzoq yillik boy tarixga ega.",
      missionTitle:
        getLocalizedValue(locale, {
          uz: about.mission_title_uz,
          ru: about.mission_title_ru,
          en: about.mission_title_en,
        }) || "Bizning missiyamiz",
      missionText:
        getLocalizedValue(locale, {
          uz: about.mission_text_uz,
          ru: about.mission_text_ru,
          en: about.mission_text_en,
        }) || "",
      visionTitle:
        getLocalizedValue(locale, {
          uz: about.vision_title_uz,
          ru: about.vision_title_ru,
          en: about.vision_title_en,
        }) || "Kelajak qarashlarimiz",
      visionText:
        getLocalizedValue(locale, {
          uz: about.vision_text_uz,
          ru: about.vision_text_ru,
          en: about.vision_text_en,
        }) || "",
      mainImageUrl: (about.main_image_url ?? "").trim(),
      secondaryImageUrl: (about.secondary_image_url ?? "").trim(),
    };
  }, [about, locale]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container-page py-24 text-center text-muted-foreground font-medium">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
          Yuklanmoqda...
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader
        title={content.title}
        breadcrumbs={[{ label: t("about.breadcrumbHome"), to: "/" }, { label: t("about.breadcrumbCurrent") }]}
        description={content.intro}
      />

      {/* Dynamic "Maktab tarixi" Section */}
      <Section className="py-12 md:py-16">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Left Column: History Title & Description */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs uppercase font-bold tracking-[0.25em] text-amber-600 block">
                {content.historyLabel}
              </span>
              <h2 className="mt-1 font-display text-2xl md:text-3xl font-extrabold text-primary-dark tracking-tight">
                {content.historyTitle}
              </h2>
              <div className="mt-2 h-1 w-16 bg-amber-500 rounded-full" />
            </div>

            <div className="whitespace-pre-line text-base leading-relaxed text-foreground/85 space-y-3 font-normal">
              {content.historyText}
            </div>
          </div>

          {/* Right Column: Dynamic Statistics Cards (4+ Cards Architecture) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            {statsList.map((s) => {
              const numValue = Number.parseInt(s.value.replace(/\D/g, ""), 10);
              const isNumeric = Number.isFinite(numValue) && numValue > 0;

              return (
                <div
                  key={s.id}
                  className="group rounded-xl border border-border/80 bg-surface-muted p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md"
                >
                  <div className="font-display text-3xl md:text-4xl font-extrabold text-primary-dark tracking-tight">
                    {isNumeric ? <Counter value={numValue} /> : s.value}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-700 transition">
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: 2 Professional Aspect-Ratio Images with Lightbox */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setLightboxImage(content.mainImageUrl || heroSchool)}
            className="group relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted text-left cursor-pointer shadow-sm"
          >
            <img
              src={content.mainImageUrl || heroSchool}
              alt={content.historyTitle}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = heroSchool;
              }}
            />
            <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
          </button>

          <button
            type="button"
            onClick={() => setLightboxImage(content.secondaryImageUrl || heroClassroom)}
            className="group relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-muted text-left cursor-pointer shadow-sm"
          >
            <img
              src={content.secondaryImageUrl || heroClassroom}
              alt={content.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = heroClassroom;
              }}
            />
            <div className="absolute inset-0 bg-black/0 transition duration-300 group-hover:bg-black/20" />
          </button>
        </div>
      </Section>

      {/* Untouched Existing Sections: Mission, Vision, Infrastructure */}
      <Section muted className="py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Target, title: content.missionTitle || t("about.missionTitle"), text: content.missionText || "" },
            { icon: Eye, title: content.visionTitle || t("about.visionTitle"), text: content.visionText || "" },
            {
              icon: Building2,
              title: t("about.infrastructureTitle"),
              text: content.intro || t("about.infrastructureDescription"),
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-6 shadow-card">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-primary-dark">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImage(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxImage(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-xl bg-slate-950 p-2 shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="h-6 w-6" />
            </button>
            <img src={lightboxImage} alt="Kattalashtirilgan rasm" className="max-h-[85vh] w-full object-contain rounded-lg" />
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
