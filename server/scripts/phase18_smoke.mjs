/** Read-only Phase 18 public API smoke test. Requires your local Express server to be running. */
const base = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
async function read(path) {
  const response = await fetch(base + path);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}: ${data.message || ''}`);
  return data;
}
try {
  const [cats, home, products, featured] = await Promise.all([
    read('/api/categories'), read('/api/banners?position=home'),
    read('/api/products?view=variants&limit=12'), read('/api/products?featured=true&limit=12')
  ]);
  if (!Array.isArray(cats.categories) || !Array.isArray(home.banners) ||
      !Array.isArray(products.products) || !Array.isArray(featured.products)) throw new Error('Unexpected response shape.');
  if (new Set(featured.products.map(p => p.id)).size !== featured.products.length) throw new Error('Featured duplicates parent product.');
  const root = cats.categories.filter(c => !c.parentId);
  const subcategories = cats.categories.filter(c => c.parentId);
  for (const child of subcategories.slice(0, 5)) {
    const [categoryProducts, categoryBanners] = await Promise.all([
      read(`/api/products?category=${encodeURIComponent(child.slug)}&view=variants&limit=12`),
      read(`/api/banners?position=category&category=${encodeURIComponent(child.slug)}`)
    ]);
    if (!Array.isArray(categoryProducts.products) || !Array.isArray(categoryBanners.banners)) throw Error(`Invalid subcategory API: ${child.slug}`);
    const overlap = home.banners.filter(b => b.position === 'both' && String(b.categoryId) === String(child.id));
    for (const banner of overlap) if (!categoryBanners.banners.some(b=>b.id===banner.id)) throw Error(`Dual-placement banner missing in ${child.slug}`);
  }
  console.log('PHASE18_READ_ONLY_SMOKE=PASS', { topLevelCategories:root.length, subcategories:subcategories.length, homeBanners:home.banners.length, catalogueCards:products.products.length });
  console.log('NOTE: product assigned to a parent is NOT automatically assigned to a child. Reassign from the product editor to appear in the child page.');
} catch(e) { console.error('PHASE18_READ_ONLY_SMOKE=FAIL:',e.message); process.exitCode = 1; }
