import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Image as ImageIcon, Youtube, Play, Calendar } from "lucide-react";
import { SiteLayout, PageHeader } from "@/components/site/SiteLayout";
import { Section } from "@/components/site/Section";
import { supabase } from "@/lib/supabase";
import { isYouTubeUrl, getYouTubeThumbnail, getYouTubeEmbedUrl } from "@/lib/youtube";

export const Route = createFileRoute("/galereya")({
  head: () => ({
    meta: [
      { title: "Galereya | 215-sonli maktab" },
      { name: "description", content: "Maktab hayoti, tadbirlar va bayramlardan rasmlar hamda videolar galereyasi." },
    ],
  }),
  component: Gallery,
});

type GalleryAlbum = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  event_date: string | null;
};

type GalleryImage = {
  id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

type FilterType = "all" | "photos" | "videos";

function formatDateDisplay(value: string | null) {
  if (!value) return "";
  const [datePart] = value.split("T");
  if (!datePart) return value;
  const [year = "", month = "", day = ""] = datePart.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function Gallery() {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  const [mediaFilter, setMediaFilter] = useState<FilterType>("all");

  const imagesSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadGallery() {
      setLoading(true);
      setError("");

      const [albumsResult, imagesResult] = await Promise.all([
        supabase
          .from("gallery_albums")
          .select("id, title, description, cover_image, event_date")
          .order("event_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("gallery_images")
          .select("id, album_id, image_url, caption, sort_order, created_at")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) {
        return;
      }

      if (albumsResult.error || imagesResult.error) {
        setError("Galereyani yuklab bo'lmadi.");
        setAlbums([]);
        setImages([]);
        setLoading(false);
        return;
      }

      setAlbums((albumsResult.data ?? []) as GalleryAlbum[]);
      setImages((imagesResult.data ?? []) as GalleryImage[]);
      setLoading(false);
    }

    loadGallery();

    return () => {
      mounted = false;
    };
  }, []);

  const imagesByAlbum = useMemo(() => {
    const grouped = new Map<string, GalleryImage[]>();
    for (const image of images) {
      const list = grouped.get(image.album_id) ?? [];
      list.push(image);
      grouped.set(image.album_id, list);
    }
    return grouped;
  }, [images]);

  const galleryAlbumCards = useMemo(
    () =>
      albums.map((album) => {
        const albumImages = imagesByAlbum.get(album.id) ?? [];
        const photoCount = albumImages.filter((img) => !isYouTubeUrl(img.image_url)).length;
        const videoCount = albumImages.filter((img) => isYouTubeUrl(img.image_url)).length;
        const firstCover = albumImages[0]?.image_url
          ? isYouTubeUrl(albumImages[0].image_url)
            ? getYouTubeThumbnail(albumImages[0].image_url)
            : albumImages[0].image_url
          : "";

        return {
          id: album.id,
          title: album.title,
          description: album.description,
          event_date: album.event_date,
          count: albumImages.length,
          photoCount,
          videoCount,
          cover: album.cover_image || firstCover,
        };
      }),
    [albums, imagesByAlbum],
  );

  useEffect(() => {
    if (galleryAlbumCards.length === 0) {
      setSelectedAlbumId(null);
      return;
    }

    if (!selectedAlbumId || !galleryAlbumCards.some((album) => album.id === selectedAlbumId)) {
      setSelectedAlbumId(galleryAlbumCards[0].id);
    }
  }, [galleryAlbumCards, selectedAlbumId]);

  const selectedAlbumCard = useMemo(
    () => galleryAlbumCards.find((album) => album.id === selectedAlbumId) ?? null,
    [galleryAlbumCards, selectedAlbumId],
  );

  const selectedAlbumImages = useMemo(() => {
    if (!selectedAlbumId) {
      return [] as GalleryImage[];
    }
    return imagesByAlbum.get(selectedAlbumId) ?? [];
  }, [imagesByAlbum, selectedAlbumId]);

  // Counts for selected album
  const counts = useMemo(() => {
    const photos = selectedAlbumImages.filter((item) => !isYouTubeUrl(item.image_url)).length;
    const videos = selectedAlbumImages.filter((item) => isYouTubeUrl(item.image_url)).length;
    return {
      all: selectedAlbumImages.length,
      photos,
      videos,
    };
  }, [selectedAlbumImages]);

  // Filtered media list
  const filteredMedia = useMemo(() => {
    if (mediaFilter === "photos") {
      return selectedAlbumImages.filter((item) => !isYouTubeUrl(item.image_url));
    }
    if (mediaFilter === "videos") {
      return selectedAlbumImages.filter((item) => isYouTubeUrl(item.image_url));
    }
    return selectedAlbumImages;
  }, [selectedAlbumImages, mediaFilter]);

  return (
    <SiteLayout>
      <PageHeader
        title="Galereya"
        breadcrumbs={[{ label: "Bosh sahifa", to: "/" }, { label: "Galereya" }]}
        description="Maktab hayoti, tadbirlar va bayramlardan rasmlar hamda videolar."
      />
      {loading ? (
        <Section>
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          </div>
        </Section>
      ) : error ? (
        <Section>
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </Section>
      ) : galleryAlbumCards.length === 0 ? (
        <Section>
          <div className="rounded-md border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-muted-foreground">Hozircha galereya albomlari yo'q.</p>
          </div>
        </Section>
      ) : (
        <>
          {/* Album Selector Grid */}
          <Section eyebrow="Albomlar" title="Foto va video albomlar">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {galleryAlbumCards.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setSelectedAlbumId(a.id);
                    setMediaFilter("all");
                    imagesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`group overflow-hidden rounded-md border bg-background text-left shadow-card transition ${
                    selectedAlbumId === a.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                  aria-pressed={selectedAlbumId === a.id}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    {a.cover ? (
                      <img
                        src={a.cover}
                        alt={a.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-sm bg-white/95 px-2 py-1 text-[11px] font-semibold text-primary-dark">
                        <ImageIcon className="h-3 w-3" />
                        {a.photoCount} foto
                      </span>
                      {a.videoCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-2 py-1 text-[11px] font-semibold text-white">
                          <Youtube className="h-3 w-3" />
                          {a.videoCount} video
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    {a.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Selected Album Content Card matching Screenshot 1 */}
          <div ref={imagesSectionRef}>
            <Section muted>
              {selectedAlbumCard && (
                <div className="space-y-6">
                  {/* Top Album Details Box */}
                  <div className="rounded-xl border border-border bg-background p-6 shadow-sm space-y-4">
                    {selectedAlbumCard.event_date && (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateDisplay(selectedAlbumCard.event_date)}
                      </div>
                    )}
                    <h2 className="text-3xl font-bold tracking-tight text-primary-dark">
                      {selectedAlbumCard.title}
                    </h2>
                    {selectedAlbumCard.description && (
                      <p className="whitespace-pre-line text-sm text-muted-foreground max-w-3xl">
                        {selectedAlbumCard.description}
                      </p>
                    )}

                    {/* Filter Tabs: Barchasi (3) | Rasmlar (1) | Videolar (2) */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setMediaFilter("all")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          mediaFilter === "all"
                            ? "bg-[#003B7A] text-white shadow-sm"
                            : "border border-border bg-background text-foreground hover:bg-surface-muted"
                        }`}
                      >
                        Barchasi ({counts.all})
                      </button>

                      <button
                        type="button"
                        onClick={() => setMediaFilter("photos")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          mediaFilter === "photos"
                            ? "bg-[#003B7A] text-white shadow-sm"
                            : "border border-border bg-background text-foreground hover:bg-surface-muted"
                        }`}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Rasmlar ({counts.photos})
                      </button>

                      <button
                        type="button"
                        onClick={() => setMediaFilter("videos")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          mediaFilter === "videos"
                            ? "bg-[#003B7A] text-white shadow-sm"
                            : "border border-border bg-background text-foreground hover:bg-surface-muted text-red-600"
                        }`}
                      >
                        <Youtube className="h-3.5 w-3.5 text-red-600" />
                        Videolar ({counts.videos})
                      </button>
                    </div>
                  </div>

                  {/* Media Grid matching Screenshot 1 & enhanced card captions */}
                  {filteredMedia.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
                      Ushbu bo'limda hech narsa topilmadi.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredMedia.map((item) => {
                        const isVid = isYouTubeUrl(item.image_url);
                        const thumb = isVid ? getYouTubeThumbnail(item.image_url) : item.image_url;

                        return (
                          <div
                            key={item.id}
                            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-elevated"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (isVid) {
                                  setLightboxVideo(getYouTubeEmbedUrl(item.image_url));
                                } else {
                                  setLightboxImage(item.image_url);
                                }
                              }}
                              className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 text-left cursor-pointer"
                            >
                              <img
                                src={thumb}
                                alt={item.caption || "Galereya fayli"}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = "/hero-classroom.jpg";
                                }}
                              />

                              {/* YouTube Video Badge on Top-Left */}
                              {isVid && (
                                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white shadow-md">
                                  <Youtube className="h-3.5 w-3.5 fill-white" />
                                  YouTube
                                </div>
                              )}

                              {/* Play Icon Center Button for YouTube Video */}
                              {isVid ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/45">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl transition duration-300 group-hover:scale-110">
                                    <Play className="h-5 w-5 fill-white ml-0.5" />
                                  </div>
                                </div>
                              ) : (
                                <div className="absolute inset-0 bg-primary-dark/0 transition group-hover:bg-primary-dark/20 flex items-center justify-center">
                                  <div className="rounded-full bg-white/90 p-2.5 opacity-0 transition duration-300 group-hover:opacity-100 shadow-md">
                                    <ImageIcon className="h-5 w-5 text-primary-dark" />
                                  </div>
                                </div>
                              )}
                            </button>

                            {/* Beautiful Integrated Caption Footer */}
                            <div className="flex-1 border-t border-border/60 bg-background p-3.5 sm:p-4">
                              <div className="flex items-start gap-2.5">
                                {isVid ? (
                                  <Youtube className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                )}
                                <p className="text-xs sm:text-sm font-medium text-foreground/95 line-clamp-2 leading-relaxed">
                                  {item.caption?.trim() || (isVid ? "Video lavha" : "Foto lavha")}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>
        </>
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={lightboxImage} alt="" className="max-h-[85vh] max-w-full rounded-md object-contain shadow-2xl" />
        </div>
      )}

      {/* YouTube Video Lightbox Modal */}
      {lightboxVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video overflow-hidden rounded-xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxVideo(null)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Yopish"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              src={lightboxVideo}
              title="YouTube Video Player"
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </SiteLayout>
  );
}
