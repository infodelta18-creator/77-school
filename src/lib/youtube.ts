export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Handle standard URLs like:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  // https://www.youtube.com/v/VIDEO_ID
  // https://www.youtube.com/shorts/VIDEO_ID
  const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[1] && match[1].length === 11) {
    return match[1];
  }

  return null;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}

export function getYouTubeThumbnail(urlOrId: string | null | undefined): string {
  const videoId = extractYouTubeId(urlOrId) || urlOrId;
  if (!videoId) {
    return "";
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(urlOrId: string | null | undefined): string {
  const videoId = extractYouTubeId(urlOrId) || urlOrId;
  if (!videoId) {
    return "";
  }
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
}
