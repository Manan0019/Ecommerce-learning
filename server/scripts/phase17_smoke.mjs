/** Read-only smoke checks. Run while your local Express server is running.
 * No database writes, no login, no external API calls.
 */
const base=(process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/,'');
async function get(path){
 const response=await fetch(base+path);
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(`${path}: HTTP ${response.status} ${data.message||''}`);
 return data;
}
try {
 const [categories,featured,variants,banners]=await Promise.all([
   get('/api/categories'),get('/api/products?featured=true&view=variants&limit=12'),
   get('/api/products?view=variants&limit=12'),get('/api/banners?position=home')
 ]);
 if(!Array.isArray(categories.categories)||!Array.isArray(featured.products)||!Array.isArray(variants.products)||!Array.isArray(banners.banners))throw Error('Unexpected API response schema');
 if(new Set(featured.products.map(p=>p.id)).size!==featured.products.length)throw Error('Featured duplicated a parent product');
 if(featured.view!=='products')throw Error('Featured must force parent-only mode');
 if(variants.view!=='variants')throw Error('Variant catalogue mode unavailable');
 console.log('PUBLIC_API_SMOKE=PASS', {categories:categories.categories.length,featuredParents:featured.products.length,skuCards:variants.products.length,banners:banners.banners.length});
} catch (error) {
 console.error('PUBLIC_API_SMOKE=FAIL',error.message);
 process.exitCode=1;
}
