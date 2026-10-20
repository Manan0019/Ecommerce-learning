#!/usr/bin/env node
// Phase 33, public endpoints only. No sign-in, mutations, transactions or uploads.
const base = (process.argv[2] || process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
let passed=0, failed=0, warned=0;
function report(type, title, detail='') {
  console.log(`${type.padEnd(4)} ${title}${detail ? ` — ${detail}` : ''}`);
  if(type==='PASS')passed++; else if(type==='FAIL')failed++; else warned++;
}
async function readJson(path) {
  const response = await fetch(base + path, {signal:AbortSignal.timeout(9000),headers:{accept:'application/json'}});
  const payload = await response.json().catch(()=>null);
  if(!response.ok)throw Error(`HTTP ${response.status}: ${payload?.message || 'No JSON error message'}`);
  return payload;
}
try { await readJson('/'); }
catch(e){console.error(`UNREACHABLE: ${base} (${e.cause?.code || e.message}). Start Express with npm run dev, then retry.`);process.exit(2);}
const catalog = await readJson('/api/products?view=products&limit=12')
  .then(data=>{if(!Array.isArray(data.products))throw Error('Missing products array');report('PASS','Parent-product catalogue',`${data.products.length} displayed`);return data.products;})
  .catch(e=>{report('FAIL','Parent-product catalogue',e.message);return []});
await readJson('/api/categories')
  .then(data=>{if(!Array.isArray(data.categories))throw Error('Missing categories');report('PASS','Public categories',`${data.categories.length} available`);})
  .catch(e=>report('FAIL','Public categories',e.message));
await readJson('/api/branding')
  .then(()=>report('PASS','Public branding API'))
  .catch(e=>report('FAIL','Public branding API',e.message));
if (!catalog.length) report('WARN','Recommendation checks','No active parent products on first catalogue page');
for(const item of catalog.slice(0,Math.min(3,catalog.length))){
  const id=String(item.id);
  const detail=await readJson(`/api/products/${encodeURIComponent(id)}`)
    .then(data=>{if(!data.product || String(data.product.id)!==id)throw Error('Detail ID does not match');report('PASS',`Product details ${id}`);return data.product;})
    .catch(e=>{report('FAIL',`Product details ${id}`,e.message);return null});
  if(!detail)continue;
  await readJson(`/api/products/${encodeURIComponent(id)}/related`)
    .then(data=>{
      if(!Array.isArray(data.products))throw Error('Expected products array');
      const ids=data.products.map(p=>String(p.id));
      if(new Set(ids).size!==ids.length || ids.includes(id) || ids.length>8)throw Error('Duplicate/self/over-limit recommendation');
      if(data.products.some(p=>!p.name || !Number.isFinite(Number(p.price))))throw Error('Recommendation missing a name or price');
      report('PASS',`Related products ${id}`,`${ids.length} valid cards`);
      if(!ids.length)report('WARN',`Related products ${id}`,'No similar active products; UI should show Explore collection');
    })
    .catch(e=>report('FAIL',`Related products ${id}`,e.message));
}
console.log(`\nPHASE33_READONLY_SMOKE: ${passed} PASS, ${failed} FAIL, ${warned} WARNING`);
process.exitCode=failed?1:0;
