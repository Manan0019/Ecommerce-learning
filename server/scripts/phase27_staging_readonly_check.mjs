// READ ONLY staging probe: never posts, edits, deletes, logs in, or places COD orders.
// Usage: node server/scripts/phase27_staging_readonly_check.mjs [http://localhost:4000]
// Optional env: API_BASE_URL=https://staging.example.com
const base = (process.argv[2] || process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/i.test(base)) {
  console.error('Pass a complete API origin, e.g. http://localhost:4000');
  process.exitCode = 2;
} else {
  const results = [];
  async function probe(name, path, check) {
    try {
      const response = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(9000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const detail = check(data);
      results.push({ name, status: 'PASS', detail });
      return data;
    } catch (error) { results.push({ name, status: 'FAIL', detail: error.message }); return null; }
  }
  await probe('API root', '/', data => {
    if (typeof data?.message !== 'string') throw new Error('Unexpected API response');
    return 'Responding';
  });
  const branding = await probe('Branding API', '/api/branding', data => {
    if (!Object.hasOwn(data, 'iconUrl') || !Object.hasOwn(data, 'faviconUrl')) throw new Error('Apply migration 019 or update backend');
    return data.iconUrl ? 'Store icon configured' : 'Default N icon in use';
  });
  await probe('Public categories', '/api/categories', data => {
    if (!Array.isArray(data?.categories) && !Array.isArray(data)) throw new Error('Unexpected categories JSON format');
    return 'Category endpoint responded';
  });
  await probe('Published catalogue', '/api/products?limit=2', data => {
    if (!Array.isArray(data?.products)) throw new Error('Unexpected products JSON format');
    return `${data.products.length} cards checked (first page)`;
  });
  if (branding) {
    for (const [name, url] of [['Brand icon',branding.iconUrl], ['Separate favicon', branding.faviconOverrideUrl]]) {
      if (!url) continue;
      if (!/^\/uploads\/branding\/[a-f0-9-]{36}\.(webp|png)$/.test(url)) {
        results.push({name,status:'FAIL',detail:'Unsafe or unexpected stored image path'});
        continue;
      }
      try {
        const r = await fetch(`${base}${url}`, { method:'HEAD', redirect:'error', signal:AbortSignal.timeout(9000) });
        const mime = r.headers.get('content-type') || '';
        if (!r.ok || !mime.startsWith('image/')) throw new Error(`HTTP ${r.status}, type ${mime}`);
        results.push({name,status:'PASS',detail:mime});
      } catch (error) { results.push({name,status:'FAIL',detail:error.message}); }
    }
    if (!branding.iconUrl) results.push({name:'Brand icon upload',status:'WARN',detail:'Fallback N is active; upload your symbol in Admin > Brand identity'});
  }
  for (const x of results) console.log(`${x.status.padEnd(4)}  ${x.name} — ${x.detail}`);
  const failed=results.filter(x=>x.status==='FAIL').length;
  console.log(`\nSTAGING_READONLY_CHECK: ${results.filter(x=>x.status==='PASS').length} PASS, ${failed} FAIL, ${results.filter(x=>x.status==='WARN').length} WARN`);
  if (failed) process.exitCode=1;
  console.log('NOTE: This does not test login, real COD orders, tax accuracy, mobile UX or deployment security.');
}
