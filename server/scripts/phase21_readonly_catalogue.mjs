/** Read-only nested categories / option filter smoke test. Requires running Express API. */
const base = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
async function request(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}
try {
  await request('/');
} catch (error) {
  console.error(`API_UNREACHABLE at ${base}: ${error.message}`);
  console.error('Start the backend first: cd server; npm run dev');
  process.exit(2);
}
const categories = (await request('/api/categories')).categories;
const lookup = new Map(categories.map(c => [String(c.id), c]));
const jeans = categories.find(c => c.name.toLowerCase() === 'jeans');
if (!jeans) {
  console.log('SKIP — No active Jeans category. Set up a category with two or more sizes to check this feature.');
  process.exit(0);
}
const trail = [];
const visited = new Set();
let category = jeans;
while (category && !visited.has(String(category.id))) {
  visited.add(String(category.id)); trail.unshift(category.name);
  category = category.parentId ? lookup.get(String(category.parentId)) : null;
}
console.log('Nested path:', trail.join(' → '));
const catalogue = await request(`/api/products?category=${encodeURIComponent(jeans.slug)}&view=variants&limit=48`);
const size = catalogue.facets.find(f => f.key === 'variant_size');
console.log('Products/configurations:', catalogue.pagination.total);
console.log('Size choices:', size?.options.map(o => o.value).join(', ') || 'None (check product SKU attributes)');
if (!size) process.exitCode = 1;
else {
  const selected = size.options[0].value;
  const filtered = await request(`/api/products?category=${encodeURIComponent(jeans.slug)}&view=variants&variant_size=${encodeURIComponent(selected)}&limit=48`);
  console.log(`Filtered Size=${selected}: ${filtered.pagination.total} configuration(s)`);
  if (filtered.pagination.total > catalogue.pagination.total) process.exitCode = 1;
}
const noImage = categories.filter(c => !c.imageUrl).map(c => c.name);
console.log('Categories awaiting dedicated images:', noImage.join(', ') || 'none');
console.log('READ_ONLY: No data or uploaded files changed.');
