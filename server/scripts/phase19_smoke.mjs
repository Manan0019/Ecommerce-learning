// Read-only smoke test. Start Express separately, then run:
// PHASE19_PRODUCT_ID=123 PHASE19_CATEGORY_SLUG=laptop node server/scripts/phase19_smoke.mjs
const base=process.env.PHASE19_API_BASE||"http://localhost:4000";
const productId=process.env.PHASE19_PRODUCT_ID;
const category=process.env.PHASE19_CATEGORY_SLUG;
async function read(path){
  const response=await fetch(`${base}${path}`);
  const payload=await response.json();
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status} ${payload.message||""}`);
  if(!Array.isArray(payload.banners))throw new Error(`${path}: expected banners array`);
  const positions=new Set(["home","category","both","product","home_product"]);
  for(const banner of payload.banners){
    if(!positions.has(banner.position)||!banner.isActive||!banner.linkUrl||!banner.imageUrl)
      throw new Error(`${path}: malformed banner ${banner.id}`);
  }
  console.log(`PASS ${path} -> ${payload.banners.length} active banner(s)`);
}
await read("/api/banners?position=home");
if(category)await read(`/api/banners?position=category&category=${encodeURIComponent(category)}`);
if(productId)await read(`/api/banners?position=product&product=${encodeURIComponent(productId)}`);
else console.log("SKIP product banners: set PHASE19_PRODUCT_ID");
