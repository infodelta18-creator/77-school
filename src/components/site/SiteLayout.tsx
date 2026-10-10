import { useEffect, useState, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AccessibilityProvider } from "./AccessibilityProvider";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <AccessibilityProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <BackToTop />
      </div>
    </AccessibilityProvider>
  );
}

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:bg-primary-dark"
      aria-label="Yuqoriga"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export function PageHeader({
  title,
  breadcrumbs,
  description,
}: {
  title: string;
  breadcrumbs: { label: string; to?: string }[];
  description?: string;
}) {
  return (
    <div className="border-b border-border bg-gradient-to-b from-primary-dark to-primary">
      <div className="container-page py-10 text-white md:py-14">
        <nav aria-label="Breadcrumbs" className="mb-3 text-xs text-white/70">
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="opacity-50">/</span>}
                {b.to ? (
                  <a href={b.to} className="hover:text-white">
                    {b.label}
                  </a>
                ) : (
                  <span className="text-white/90">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="max-w-3xl font-display text-3xl font-bold tracking-tight md:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm text-white/80 md:text-base">{description}</p>
        )}
        <div className="mt-5 h-1 w-16 bg-gold" />
      </div>
    </div>
  );
}
