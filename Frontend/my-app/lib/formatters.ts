// Small display helpers shared by several screens.

// 850 -> "850 ms", 12345 -> "12.3 s"
export function formatDuration(ms: number | null) {
  if (ms === null) return "–";
  return ms < 1000 ? ms + " ms" : (ms / 1000).toFixed(1) + " s";
}

// null -> "–", 12345 -> "12,345"
export function formatTokens(count: number | null) {
  return count === null ? "–" : count.toLocaleString("en-US");
}

// "sha256:abc123..." or "abc123..." -> "abc123def456" (enough to tell versions apart)
export function shortDigest(digest: string) {
  return digest.replace(/^sha256:/, "").slice(0, 12);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}
