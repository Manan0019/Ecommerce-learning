/**
 * Final Nexora public API smoke test. READ ONLY: GET requests plus POST /api/cart/quote,
 * which calculates a quote without changing stock, carts, orders or payments.
 * Run while the Express API is already running, e.g. from project root:
 *   node server/scripts/final_readonly_smoke.mjs
 * Optional: set API_BASE_URL=http://localhost:4000
 */
const base = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const failures = [];
const warnings = [];
const checks = [];

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(9000), ...options });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} — ${body?.message ?? 'non-JSON response'}`);
  if (!body || typeof body !== 'object') throw new Error(`${path}: expected JSON object`);
  return body;
}

async function check(label, fn) {
  try {
    const detail = await fn();
    checks.push({ label, result: 'PASS', detail: String(detail ?? '') });
    console.log(`PASS  ${label}${detail == null ? '' : ` — ${detail}`}`);
  } catch (e) {
    failures.push({ label, reason: e.message });
    console.error(`FAIL  ${label} — ${e.message}`);
  }
}
function warn(label, message) {
  warnings.push({ label, reason: message });
  console.log(`WARN  ${label} — ${message}`);
}
function requireArray(body, field, route) {
  if (!Array.isArray(body[field])) throw new Error(`${route}: missing ${field} array`);
  return body[field];
}

let categories = [];
let parents = [];
await check('Category API', async () => {
  const body = await request('/api/categories');
  categories = requireArray(body, 'categories', '/api/categories');
  const knownIds = new Set(categories.map(c => String(c.id)));
  for (const c of categories) {
    if (c.parentId && !knownIds.has(String(c.parentId))) warn('Category hierarchy', `${c.name} references inactive or missing parent ${c.parentId}`);
  }
  return `${categories.length} active categories`;
});
await check('One-card-per-parent catalogue', async () => {
  const body = await request('/api/products?view=products&limit=12');
  parents = requireArray(body, 'products', 'grouped catalogue');
  if (!body.pagination || body.view !== 'products') throw new Error('Missing pagination or wrong view');
  const ids = parents.map(p => String(p.id));
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate parent product in grouped response');
  return `${parents.length} cards on first page; ${body.pagination.total} total`;
});
await check('SKU catalogue', async () => {
  const body = await request('/api/products?view=variants&limit=12');
  requireArray(body, 'products', 'variants catalogue');
  if (!body.pagination || body.view !== 'variants') throw new Error('Missing pagination or wrong view');
  return `${body.pagination.total} sellable/listed configurations`;
});
await check('Grouped colour catalogue', async () => {
  const body = await request('/api/products?view=colors&limit=12');
  requireArray(body, 'products', 'colours catalogue');
  if (!body.pagination) throw new Error('Missing pagination');
  return `${body.products.length} color cards on first page`;
});
await check('Featured products (no duplicates)', async () => {
  const body = await request('/api/products?featured=true&limit=12');
  const featured = requireArray(body, 'products', 'featured catalogue');
  const ids = featured.map(p => String(p.id));
  if (new Set(ids).size !== ids.length) throw new Error('Parent product appears more than once');
  return `${featured.length} featured cards`;
});
await check('Homepage promotion API', async () => {
  const body = await request('/api/banners?position=home');
  return `${requireArray(body, 'banners', 'homepage banners').length} banners`;
});
const firstCategory = categories.find(c => c.parentId) || categories[0];
if (firstCategory) {
  await check('Category/subcategory catalogue', async () => {
    const body = await request(`/api/products?category=${encodeURIComponent(firstCategory.slug)}&view=variants&limit=12`);
    requireArray(body, 'products', 'category catalogue');
    return firstCategory.name;
  });
  await check('Category promotion API', async () => {
    const body = await request(`/api/banners?position=category&category=${encodeURIComponent(firstCategory.slug)}`);
    return `${requireArray(body, 'banners', 'category banners').length} banners for ${firstCategory.name}`;
  });
}
const firstProduct = parents[0];
if (firstProduct) {
  const id = String(firstProduct.id);
  await check('Product details', async () => {
    const body = await request(`/api/products/${encodeURIComponent(id)}`);
    if (!body.product || String(body.product.id) !== id) throw new Error('Product ID mismatch');
    return body.product.name;
  });
  let variants = [];
  await check('Public variants', async () => {
    const body = await request(`/api/products/${encodeURIComponent(id)}/variants`);
    variants = requireArray(body, 'variants', 'variants');
    return `${variants.length} active SKU(s)`;
  });
  await check('Product gallery', async () => {
    const body = await request(`/api/products/${encodeURIComponent(id)}/media`);
    return `${requireArray(body, 'media', 'gallery').length} media items`;
  });
  await check('Related products', async () => {
    const body = await request(`/api/products/${encodeURIComponent(id)}/related`);
    return `${requireArray(body, 'products', 'related products').length} matches`;
  });
  await check('Product-specific promotions', async () => {
    const body = await request(`/api/banners?position=product&product=${encodeURIComponent(id)}`);
    return `${requireArray(body, 'banners', 'product banners').length} banners`;
  });
  const variant = variants[0];
  await check('Server-side cart pricing (no order created)', async () => {
    const payload = { items: [{ productId: id, ...(variant ? {variantId: String(variant.id)} : {}), quantity: 1 }] };
    const body = await request('/api/cart/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (!Array.isArray(body.items) || body.items.length !== 1 || body.availableSubtotal == null || body.subtotal == null)
      throw new Error('Cart quote response missing data');
    return `available=${body.items[0].available}, total=₹${body.availableSubtotal}`;
  });
} else {
  warn('Product flows', 'No published parent product on first page. Product/gallery/SKU/cart quote integration not exercised.');
}

console.log(`\nREAD_ONLY_SMOKE: ${checks.length} PASS, ${failures.length} FAIL, ${warnings.length} WARNING`);
if (failures.length) process.exitCode = 1;
