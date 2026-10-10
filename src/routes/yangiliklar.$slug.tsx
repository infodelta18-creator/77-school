import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Calendar, Tag, Share2, ArrowLeft, Image as ImageIcon, Youtube } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "@/lib/youtube";

export const Route = createFileRoute("/yangiliklar/$slug")({
  head: () => ({
    meta: [
          { title: "Yangilik | 215-sonli maktab" },
      { name: "description", content: "Maktab yangiligi" },
    ],
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("news")
      .select("id, title, slug, excerpt, content, featured_image, external_link, external_link_label, published_at, created_at, news_categories(name)")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    if (error || !data) {
      throw notFound();
    }

    const n = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt ?? "",
      content: data.content,
      image: data.featured_image ?? "",
      external_link: data.external_link ?? "",
      external_link_label: data.external_link_label ?? "",
      date: data.published_at ?? data.created_at,
      category: data.news_categories?.[0]?.name ?? "Yangilik",
    };

    const { data: relatedData } = await supabase
      .from("news")
      .select("id, title, slug, featured_image, published_at, created_at")
      .neq("slug", params.slug)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(3);

    const related = (relatedData ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      image: item.featured_image ?? "",
      date: item.published_at ?? item.created_at,
    }));

    if (!n) throw notFound();
    return { article: n, related };
  },
  component: NewsDetail,
  notFoundComponent: NewsNotFound,
});

function NewsNotFound() {
  return (
    <SiteLayout>
      <Section>
        <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Yangilik topilmadi</h1>
          <Link to="/yangiliklar" className="mt-4 inline-flex items-center gap-1.5 text-primary">
            <ArrowLeft className="h-4 w-4" /> Yangiliklarga qaytish
          </Link>
        </div>
      </Section>
    </SiteLayout>
  );
}

function NewsDetail() {
  const { article: n, related } = Route.useLoaderData() as {
    article: {
      id: string;
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      image: string;
      external_link: string;
      external_link_label: string;
      date: string;
      category: string;
    };
    related: Array<{ id: string; title: string; slug: string; image: string; date: string }>;
  };
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isShareOpen) {
      return;
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setIsShareOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsShareOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isShareOpen]);

  function formatDateDDMMYYYY(value: string) {
    const [datePart] = value.split("T");
    const [year = "", month = "", day = ""] = datePart.split("-");
    if (!year || !month || !day) {
      return value;
    }
    return `${day}.${month}.${year}`;
  }

  const getCurrentDetailUrl = () => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.location.href;
  };

  const openShareWindow = (url: string) => {
    if (typeof window === "undefined") {
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setIsShareOpen(false);
  };

  const handleShareTelegram = () => {
    const detailUrl = getCurrentDetailUrl();
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(detailUrl)}&text=${encodeURIComponent(n.title)}`;
    openShareWindow(telegramUrl);
  };

  const handleShareWhatsApp = () => {
    const detailUrl = getCurrentDetailUrl();
    const text = `${n.title} ${detailUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    openShareWindow(whatsappUrl);
  };

  const copyWithFallback = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
  };

  const handleCopyLink = async () => {
    const detailUrl = getCurrentDetailUrl();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(detailUrl);
      } else {
        copyWithFallback(detailUrl);
      }
      setCopyFeedback("Havola nusxalandi");
      setTimeout(() => setCopyFeedback(""), 2000);
      setIsShareOpen(false);
    } catch {
      setCopyFeedback("Nusxalab bo'lmadi");
      setTimeout(() => setCopyFeedback(""), 2000);
    }
  };

  return (
    <SiteLayout>
      <PageHeader
        title={n.title}
        breadcrumbs={[
          { label: "Bosh sahifa", to: "/" },
          { label: "Yangiliklar", to: "/yangiliklar" },
          { label: n.title },
        ]}
      />
      <Section>
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 px-2 py-1 font-semibold text-primary">
              <Tag className="h-3.5 w-3.5" />
              {n.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateDDMMYYYY(n.date)}
            </span>
          </div>
          {/* Side-by-Side Media Showcase Grid */}
          {(() => {
            const hasPhoto = Boolean(n.image);
            const hasVideo = Boolean(n.external_link && isYouTubeUrl(n.external_link));

            if (hasPhoto && hasVideo) {
              return (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {/* Photo Card */}
                  <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-card">
                    <div className="flex items-center gap-2 border-b border-border/60 bg-surface-muted px-4 py-2.5 text-xs font-semibold text-primary-dark">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Asosiy rasm
                    </div>
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      <img
                        src={n.image}
                        alt={n.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Video Card */}
                  <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-card">
                    <div className="flex items-center gap-2 border-b border-border/60 bg-red-50/50 px-4 py-2.5 text-xs font-semibold text-red-700">
                      <Youtube className="h-4 w-4 text-red-600 fill-red-600" />
                      Video taqdimot
                    </div>
                    <div className="aspect-[16/10] w-full overflow-hidden bg-black">
                      <iframe
                        src={getYouTubeEmbedUrl(n.external_link)}
                        title={n.title}
                        className="h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              );
            }

            if (hasPhoto) {
              return (
                <div className="mt-8 overflow-hidden rounded-xl border border-border shadow-card">
                  <img src={n.image} alt={n.title} className="w-full object-cover aspect-[16/9]" />
                </div>
              );
            }

            if (hasVideo) {
              return (
                <div className="mt-8 overflow-hidden rounded-xl border border-border shadow-card aspect-[16/9]">
                  <iframe
                    src={getYouTubeEmbedUrl(n.external_link)}
                    title={n.title}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            }

            return null;
          })()}
          <div className="prose mt-8 max-w-none text-[15px] leading-relaxed text-foreground/85">
            <p className="text-lg font-medium text-foreground">{n.excerpt}</p>
            <p className="mt-4 whitespace-pre-line">{n.content}</p>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <Link to="/yangiliklar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <ArrowLeft className="h-4 w-4" /> Barcha yangiliklar
            </Link>
            <div className="flex items-center gap-2">
              {n.external_link ? (
                <a
                  href={n.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/50"
                >
                  {n.external_link_label || "Batafsil"}
                </a>
              ) : null}
              <div className="relative" ref={shareMenuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isShareOpen}
                  aria-controls="news-share-menu"
                  onClick={() => setIsShareOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/50"
                >
                  <Share2 className="h-4 w-4" /> Ulashish
                </button>
                {isShareOpen ? (
                  <div
                    id="news-share-menu"
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-2 min-w-[210px] rounded-md border border-border bg-background p-2 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleShareTelegram}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      Telegram
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleShareWhatsApp}
                      className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleCopyLink}
                      className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                    >
                      Havolani nusxalash
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {copyFeedback ? <p className="mt-2 text-xs text-emerald-600">{copyFeedback}</p> : null}
        </article>

        <div className="mx-auto mt-16 max-w-6xl">
          <h2 className="section-title relative pb-3">
            O‘xshash yangiliklar
            <span className="absolute left-0 bottom-0 h-0.5 w-12 bg-gold" />
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/yangiliklar/$slug"
                params={{ slug: r.slug }}
                className="group overflow-hidden rounded-md border border-border bg-background shadow-card"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  {r.image ? (
                    <img src={r.image} alt={r.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : null}
                </div>
                <div className="p-4">
                  <div className="text-xs text-muted-foreground">
                    {formatDateDDMMYYYY(r.date)}
                  </div>
                  <h3 className="mt-1 line-clamp-2 font-semibold text-foreground group-hover:text-primary">
                    {r.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </SiteLayout>
  );
}
