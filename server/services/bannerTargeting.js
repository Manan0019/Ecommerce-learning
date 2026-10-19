/** The displayed placement and the click destination are independent decisions. */
export function validBannerDestination(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 400) return false;
  const url = value.trim();
  if (/^\/(?!\/)/.test(url) && !/[\\\u0000-\u001f]/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password && !/[\u0000-\u001f]/.test(url);
  } catch { return false; }
}
export function validBannerPlacement(position, categoryId) {
  const hasCategory = typeof categoryId === "string" && /^[1-9]\d*$/.test(categoryId);
  return position === "home" ? !categoryId : ["category", "both"].includes(position) && hasCategory;
}
export function isExternalBannerDestination(value) { return typeof value === "string" && value.startsWith("https://"); }
