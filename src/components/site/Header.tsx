import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  Phone,
  Search,
  Menu,
  X,
  Accessibility,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { SchoolLogo } from "./Logo";
import { useAccessibility } from "./AccessibilityProvider";
import { useLanguage } from "@/lib/language";
import { getUzDateParts } from "@/lib/date-format";

const NAV = [
  { to: "/", labelKey: "nav.home" },
  { to: "/maktab-haqida", labelKey: "nav.about" },
  { to: "/rahbariyat", labelKey: "nav.leadership" },
  { to: "/oqituvchilar", labelKey: "nav.teachers" },
  { to: "/yangiliklar", labelKey: "nav.news" },
  { to: "/elonlar", labelKey: "nav.announcements" },
  { to: "/oquvchilar-uchun", labelKey: "nav.students" },
  { to: "/ota-onalar-uchun", labelKey: "nav.parents" },
  { to: "/hujjatlar", labelKey: "nav.documents" },
  { to: "/galereya", labelKey: "nav.gallery" },
  { to: "/boglanish", labelKey: "nav.contact" },
] as const;

function formatDate() {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parts = getUzDateParts(iso);
  return `${parts.day.padStart(2, "0")} ${parts.monthName}, ${parts.year}`;
}


export function Header() {
  const [open, setOpen] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const { locale, setLocale, t } = useLanguage();
  useEffect(() => setDateStr(formatDate()), [locale]);
  const { togglePanel } = useAccessibility();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { settings } = useSiteSettings();


  return (
    <header className="sticky top-0 z-40 w-full bg-background shadow-header">
      {/* Utility bar */}
      <div className="hidden bg-primary-dark text-[13px] text-white/90 md:block">
        <div className="container-page flex h-9 items-center justify-between">
          <div className="flex items-center gap-4">
            <span>{siteConfig.country}</span>
            <span className="text-white/40">·</span>
            <span className="text-white/70">{siteConfig.ministry}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-white/80">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr}
            </span>
            <div className="flex items-center gap-1 rounded-sm bg-white/5 p-0.5">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  aria-pressed={locale === l}
                  className={`px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wider transition ${
                    locale === l ? "bg-white text-primary-dark" : "text-white/70 hover:text-white"
                  }`}
                >
                  {l === "uz" ? t("lang.uz") : l === "ru" ? t("lang.ru") : t("lang.en")}
                </button>
              ))}
            </div>
            <button
              onClick={togglePanel}
              className="inline-flex items-center gap-1 text-white/80 hover:text-white"
              aria-label={t("header.accessibility")}
            >
              <Accessibility className="h-4 w-4" />
            </button>
            <button type="button" aria-label={t("header.search")} className="text-white/80 hover:text-white">
              <Search className="h-4 w-4" />
            </button>
            <a href={`tel:${settings.phone}`} className="inline-flex items-center gap-1.5 text-white/90 hover:text-white">
              <Phone className="h-3.5 w-3.5" />
              {settings.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-border bg-background">
        <div className="container-page flex h-20 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <SchoolLogo className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold uppercase tracking-tight text-primary-dark md:text-base">
                {settings.organizationName.toUpperCase()}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {settings.address}
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-foreground">{settings.phone}</div>
              <div className="text-xs text-muted-foreground">{t("header.trustPhone")}</div>
            </div>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-foreground lg:hidden"
            aria-label={open ? t("header.menuClose") : t("header.menuOpen")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="hidden border-b border-border bg-surface-muted lg:block" aria-label={t("header.mainNav")}>
        <div className="container-page flex items-center">
          <ul className="flex flex-wrap items-stretch">
            {NAV.map((item) => {
              const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`relative inline-flex h-11 items-center px-3.5 text-[13.5px] font-medium transition-colors ${
                      active
                        ? "text-primary-dark"
                        : "text-foreground/80 hover:text-primary"
                    }`}
                  >
                    {t(item.labelKey)}
                    {active && (
                      <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <nav className="border-b border-border bg-background lg:hidden" aria-label={t("header.mobileNav")}>
          <ul className="container-page flex flex-col py-2">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-md px-3 py-3 text-sm ${
                      active ? "bg-primary/5 text-primary" : "text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {t(item.labelKey)}
                    <ChevronDown className="h-4 w-4 -rotate-90 opacity-40" />
                  </Link>
                </li>
              );
            })}
            <li className="mt-2 border-t border-border pt-3">
              <a
                href={`tel:${settings.phone}`}
                className="flex items-center gap-3 rounded-md bg-primary px-3 py-3 text-sm font-medium text-primary-foreground"
              >
                <Phone className="h-4 w-4" />
                {settings.phone}
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
