/** A banner's placement and click destination are independent. */
export function validBannerDestination(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 400) return false;
  const url = value.trim();
  // Only same-origin relative URLs; disallow protocol-relative links, backslashes, and controls.
  if (/^\/(?!\/)/.test(url) && !/[\\\u0000-\u001f\u007f]/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password
      && !/[\u0000-\u001f\u007f]/.test(url);
  } catch { return false; }
}

const idOk = value => typeof value === "string" && /^[1-9]\d*$/.test(value);
export function validBannerPlacement(position, categoryId, productId = null) {
  const category = idOk(categoryId);
  const product = idOk(productId);
  switch (position) {
    case "home": return !category && !product;
    case "category":
    case "both": return category && !product;
    case "product":
    case "home_product": return product && !category;
    default: return false;
  }
}
export function isExternalBannerDestination(value) {
  return typeof value === "string" && value.startsWith("https://");
}
export function productDestination(id) {
  if (!idOk(String(id))) throw new Error("Invalid product ID");
  return `/products/${id}`;
}
