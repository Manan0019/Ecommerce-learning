/** Nexora CSS compilation: author styles in src/styles/modules, never in site.css.
 * Concatenation follows the original stylesheet's cascade order. No dependencies.
 * Outputs one Vite stylesheet to preserve selector priority and historical tests.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {watch} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src/styles');
const modules = [
  "modules/foundation/reset.css",
  "modules/foundation/form-controls.css",
  "modules/layouts/admin-workspace.css",
  "modules/layouts/storefront-shell.css",
  "modules/layouts/footer.css",
  "modules/commerce/product-catalogue.css",
  "modules/commerce/checkout-and-cart.css",
  "modules/commerce/product-discovery.css",
  "modules/commerce/orders-and-delivery.css",
  "modules/commerce/storefront-navigation.css",
  "modules/commerce/customer-engagement.css",
  "modules/admin/workspace-controls.css",
  "modules/admin/catalogue-management.css",
  "modules/admin/shipping-settings.css",
  "modules/customer/product-reviews.css"
];
const filename=path.join(root,'site.css');
async function generate({check=false}={}){
  const parts=await Promise.all(modules.map(relative=>readFile(path.join(root,relative),'utf8')));
  const merged=parts.join('');
  if(check){let actual;try{actual=await readFile(filename,'utf8')}catch{actual=''}
    if(actual!==merged){console.error('site.css is out of date. Run npm run styles:build.');process.exitCode=1;return;}
    console.log('Nexora stylesheet is up to date.');return;
  }
  await mkdir(path.dirname(filename),{recursive:true});
  await writeFile(filename,merged);
  console.log(`Generated site.css from ${modules.length} purpose-named CSS modules.`);
}
await generate({check:process.argv.includes('--check')});
if(process.argv.includes('--watch')){
  // Individual file watchers work on Windows and Linux without recursive fs.watch.
  let pending;
  for(const relative of modules){watch(path.join(root,relative),()=>{
     clearTimeout(pending);pending=setTimeout(()=>generate().catch(error=>console.error(error)),80);
  });}
  console.log('Watching CSS modules. Stop with Ctrl+C.');
}
