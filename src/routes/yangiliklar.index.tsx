import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowRight, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";
import { isYouTubeUrl } from "@/lib/youtube";

export const Route = createFileRoute("/yangiliklar/")({
  head: () => ({
    meta: [
      { title: "Yangiliklar | 215-sonli maktab" },
      { name: "description", content: "215-sonli maktab hayotidan so‘nggi yangiliklar, tadbirlar va yutuqlar." },
    ],
  }),
  loader: async () => {
    const { data, error } = await supabase
      .from("news")
      .select("id, title, slug, excerpt, featured_image, external_link, external_link_label, published_at, created_at, news_categories(name)")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      return { news: [] as NewsItem[] };
    }

    return {
      news: (data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt ?? "",
        image: item.featured_image ?? "",
        external_link: item.external_link ?? "",
        external_link_label: item.external_link_label ?? "",
        date: item.published_at ?? item.created_at,
        category: item.news_categories?.[0]?.name ?? "Yangilik",
      })) as NewsItem[],
    };
  },
  component: NewsList,
});

type NewsItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  external_link: string;
  external_link_label: string;
  date: string;
  category: string;
};

function formatDateDDMMYYYY(value: string) {
  const [datePart] = value.split("T");
  const [year = "", month = "", day = ""] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}.${month}.${year}`;
}

function NewsList() {
  const { news } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Barchasi");
  const categories = useMemo(() => ["Barchasi", ...Array.from(new Set(news.map((item) => item.category)))], [news]);
  const items = useMemo(
    () =>
      news.filter(
        (n) =>
          (cat === "Barchasi" || n.category === cat) &&
          (q === "" || n.title.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, cat, news],
  );

  return (
    <SiteLayout>
      <PageHeader
        title="Yangiliklar"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Yangiliklar" }]}
      />
      <Section>
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Yangiliklar bo‘yicha qidiruv..."
              className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Hozircha chop etilgan yangiliklar yo‘q.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <Link
                key={n.slug}
                to="/yangiliklar/$slug"
                params={{ slug: n.slug }}
                className="group overflow-hidden rounded-md border border-border bg-background shadow-card transition hover:shadow-elevated"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                  {n.image ? (
                    <img
                      src={n.image}
                      alt={n.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : null}
                  {n.external_link && isYouTubeUrl(n.external_link) && (
                    <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
                      <Youtube className="h-3 w-3 fill-white" />
                      Video
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-sm bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                      {n.category}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateDDMMYYYY(n.date)}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-lg font-bold leading-snug text-foreground group-hover:text-primary">
                    {n.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{n.excerpt}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Batafsil <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </SiteLayout>
  );
}
