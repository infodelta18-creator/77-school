import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone, ChevronLeft, ChevronRight } from "lucide-react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { useLanguage } from "@/lib/language";

const HERO_SLIDES = [
  {
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2000&q=80",
  },
  {
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=2000&q=80",
  },
  {
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=2000&q=80",
  },
];

export function Hero() {
  const [i, setI] = useState(0);
  const { settings } = useSiteSettings();
  const { t } = useLanguage();
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % HERO_SLIDES.length), 7000);
    return () => clearInterval(t);
  }, []);
  const slideCopy = [
    {
      eyebrow: settings.organizationShortName,
      title: t("home.hero.slide1.title"),
      description: `${settings.organizationName} — ${t("home.hero.slide1.description")}`,
    },
    {
      eyebrow: t("home.hero.slide2.eyebrow"),
      title: t("home.hero.slide2.title"),
      description: t("home.hero.slide2.description"),
    },
    {
      eyebrow: t("home.hero.slide3.eyebrow"),
      title: t("home.hero.slide3.title"),
      description: t("home.hero.slide3.description"),
    },
  ];
  const copy = slideCopy[i];
  const eyebrow = copy.eyebrow;
  const title = copy.title;
  const description = copy.description;

  return (
    <section className="relative overflow-hidden bg-primary-dark">
      <div className="absolute inset-0">
        {HERO_SLIDES.map((s, idx) => (
          <img
            key={idx}
            src={s.image}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
              idx === i ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/90 via-primary-dark/70 to-primary-dark/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/60 to-transparent" />
      </div>

      <div className="container-page relative py-20 md:py-28 lg:py-32">
        <div className="max-w-2xl text-white">
          <div className="inline-flex items-center gap-2 rounded-sm border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            🇺🇿 {eyebrow}
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/maktab-haqida"
              className="group inline-flex items-center gap-2 rounded-md bg-primary-foreground px-5 py-3 text-sm font-semibold text-primary-dark shadow-elevated transition hover:bg-white"
            >
              {t("home.hero.about")}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/boglanish"
              className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4" />
              {t("home.hero.contact")}
            </Link>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4">
          <button
            onClick={() => setI((v) => (v - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/30 text-white/90 backdrop-blur hover:bg-white/10"
            aria-label={t("home.hero.previous")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1 rounded-full transition-all ${
                  idx === i ? "w-10 bg-gold" : "w-6 bg-white/30"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setI((v) => (v + 1) % HERO_SLIDES.length)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/30 text-white/90 backdrop-blur hover:bg-white/10"
            aria-label={t("home.hero.next")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
