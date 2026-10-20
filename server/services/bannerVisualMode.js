// Older promotions default to text-overlay mode. Explicit false turns off both
// marketing copy and dark overlay without losing their admin title or link.
export function parseBannerVisualMode(value) {
  if (value === undefined || value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}
