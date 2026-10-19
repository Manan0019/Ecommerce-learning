// Pure constraints, shared by image processing and focused tests.
export function acceptableSymbolDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 32 || height < 32) return false;
  const ratio = width / height;
  return ratio >= 0.45 && ratio <= 2.2 && width * height <= 12_000_000;
}

export function resolveFaviconUrl(iconUrl, faviconUrl) {
  return faviconUrl || iconUrl || null;
}
