import { visibleProductMedia } from './galleryMedia.js';

/** Before selection, customers can browse all authentic saved product photographs.
 * After selection, show only shared and matching variant/attribute photographs.
 * Never use an unrelated variant photograph as a selected variant fallback.
 */
export function quickViewPictures(media = [], selectedVariant = null, hasVariants = false, coverUrl = null) {
  const list = Array.isArray(media) ? media : [];
  const gallery = (selectedVariant
    ? visibleProductMedia(list, selectedVariant.id, selectedVariant.attributes || {})
    : hasVariants ? [...list].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0))
    : visibleProductMedia(list)).filter(item => item.type === 'image' && item.url);
  // Many size SKUs intentionally point at the same photograph. Show each image once.
  const seen = new Set();
  const unique = gallery.filter(item => {
    const url = String(item.url);
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
  if (unique.length) return unique;
  if (!selectedVariant && coverUrl) return [{ id: 'cover', url: coverUrl, type: 'image' }];
  return [];
}
