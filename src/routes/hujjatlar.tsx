import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/hujjatlar")({
  head: () => ({
    meta: [
      { title: "Hujjatlar | 215-sonli maktab" },
      { name: "description", content: "Maktabning rasmiy hujjatlari, nizom, buyruqlar va hisobotlar bazasi." },
    ],
  }),
  component: Documents,
});

type DocumentItem = {
  id: string;
  title: string;
  category: string;
  date: string;
  type: string;
  fileUrl: string;
};

function formatDateDDMMYYYY(value: string) {
  const [datePart] = value.split("T");
  const [year = "", month = "", day = ""] = datePart.split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}.${month}.${year}`;
}

function inferFileType(fileUrl: string, fileType: string | null) {
  if (fileType?.trim()) {
    return fileType.trim().toUpperCase();
  }

  const extension = fileUrl.split("?")[0]?.split(".").pop()?.toUpperCase();
  return extension || "FILE";
}

function Documents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Barchasi");

  useEffect(() => {
    let mounted = true;

    async function loadDocuments() {
      setLoading(true);
      setError("");
      const nowIso = new Date().toISOString();

      const { data, error: fetchError } = await supabase
        .from("documents")
        .select("id, title, category, file_url, file_type, published_at, created_at")
        .eq("status", "published")
        .or(`published_at.is.null,published_at.lte.${nowIso}`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (!mounted) {
        return;
      }

      if (fetchError) {
        setError("Hujjatlarni yuklab bo'lmadi.");
        setDocs([]);
        setLoading(false);
        return;
      }

      const mapped = (data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category ?? "Boshqa",
        date: item.published_at ?? item.created_at,
        type: inferFileType(item.file_url, item.file_type),
        fileUrl: item.file_url,
      }));

      setDocs(mapped);
      setLoading(false);
    }

    loadDocuments();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => ["Barchasi", ...Array.from(new Set(docs.map((d) => d.category)))], [docs]);

  const list = useMemo(
    () =>
      docs.filter(
        (d) =>
          (cat === "Barchasi" || d.category === cat) &&
          (q === "" || d.title.toLowerCase().includes(q.toLowerCase())),
      ),
    [docs, q, cat],
  );

  return (
    <SiteLayout>
      <PageHeader
        title="Hujjatlar"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Hujjatlar" }]}
        description="Maktabning rasmiy hujjatlari va ochiq ma’lumotlari bilan tanishing."
      />
      <Section>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Hujjat nomi bo‘yicha qidiruv..."
              className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                  cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          </div>
        ) : error ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Hozircha hujjatlar yo'q.</p>
          </div>
        ) : (

        <div className="overflow-hidden rounded-md border border-border bg-background shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Hujjat</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Kategoriya</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Sana</th>
                <th className="px-4 py-3 font-semibold">Turi</th>
                <th className="px-4 py-3 text-right font-semibold">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((d) => (
                <tr key={d.id} className="hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{d.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                          {d.category} · {formatDateDDMMYYYY(d.date)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{d.category}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {formatDateDDMMYYYY(d.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">{d.type}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/50"
                    >
                      <Download className="h-3.5 w-3.5" /> Yuklab olish
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Section>
    </SiteLayout>
  );
}
