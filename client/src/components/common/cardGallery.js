/** Return the card's actual, eligible gallery images, not unrelated colour/SKU media.
 * `previewImages` is the server-filtered, authoritative list. The cover is a
 * fallback for older responses; it never adds a potentially wrong variant image.
 */
export function cardGalleryImages(product, failed = []) {
  const serverImages = Array.isArray(product?.previewImages) ? product.previewImages : null;
  const input = serverImages?.length ? serverImages : [product?.imageUrl];
  const excluded = new Set(failed);
  const seen = new Set();
  const result = [];
  for (const value of input) {
    if (typeof value !== 'string') continue;
    const src = value.trim();
    if (!src || excluded.has(src) || seen.has(src)) continue;
    seen.add(src);
    result.push(src);
    if (result.length === 6) break;
  }
  return result;
}

export const canPreviewGallery = images => Array.isArray(images) && images.length >= 2;
export const galleryIndex = (index, count) => count > 0 ? ((index % count) + count) % count : 0;
