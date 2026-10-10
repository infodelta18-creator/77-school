import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Mail, Clock, Send, Facebook, Youtube, Instagram } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { SchoolLogo } from "./Logo";
import { useLanguage } from "@/lib/language";

export function Footer() {
  const { settings } = useSiteSettings();
  const { t } = useLanguage();

  return (
    <footer className="mt-16 bg-primary-dark text-white/85">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <SchoolLogo className="h-11 w-11" />
            <div>
              <div className="text-sm font-semibold text-white">{settings.organizationShortName}</div>
              <div className="text-xs text-white/60">{t("footer.officialSite")}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            {settings.organizationName} — {t("footer.description")}
          </p>
          <div className="mt-5 flex items-center gap-2">
            {[
              { icon: Send, href: settings.telegramUrl || siteConfig.socials.telegram, label: "Telegram" },
              { icon: Facebook, href: settings.facebookUrl || siteConfig.socials.facebook, label: "Facebook" },
              { icon: Youtube, href: settings.youtubeUrl || siteConfig.socials.youtube, label: "YouTube" },
              { icon: Instagram, href: settings.instagramUrl || siteConfig.socials.instagram, label: "Instagram" },
            ]
              .filter((item) => item.href)
              .map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t("footer.quickLinks")}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { to: "/maktab-haqida", label: t("footer.aboutSchool") },
              { to: "/yangiliklar", label: t("footer.news") },
              { to: "/oqituvchilar", label: t("footer.teachers") },
              { to: "/hujjatlar", label: t("footer.documents") },
              { to: "/galereya", label: t("footer.gallery") },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-white/70 transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t("footer.forUsers")}</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { to: "/oquvchilar-uchun", label: t("footer.forStudents") },
              { to: "/ota-onalar-uchun", label: t("footer.forParents") },
              { to: "/ota-onalar-uchun", label: t("footer.reception") },
              { to: "/virtual-qabulxona", label: t("footer.virtualReception") },
              { to: "/elonlar", label: t("footer.announcements") },
            ].map((l, i) => (
              <li key={i}>
                <Link to={l.to} className="text-white/70 transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t("footer.contact")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{settings.address}</span>
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a>
            </li>
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <span>{settings.workingHours}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-start justify-between gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center">
          <div>© 2026 {settings.organizationName}. {t("footer.rights")}</div>
          <div className="flex items-center gap-4">
            <Link to="/hujjatlar" className="hover:text-white">{t("footer.regulations")}</Link>
            <Link to="/boglanish" className="hover:text-white">{t("footer.contactLink")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
