// Pure helper smoke tests without requiring a running Vite server.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'variant-tests-'));
const src=new URL('../src/components/admin/',import.meta.url);
const pricing=await fs.readFile(new URL('variantPricing.js',src),'utf8');
const generator=(await fs.readFile(new URL('variantGenerator.js',src),'utf8')).replace('"./variantPricing"','"./variantPricing.mjs"');
await fs.writeFile(path.join(dir,'variantPricing.mjs'),pricing);
await fs.writeFile(path.join(dir,'variantGenerator.mjs'),generator);
const price=await import(pathToFileURL(path.join(dir,'variantPricing.mjs')).href);
const gen=await import(pathToFileURL(path.join(dir,'variantGenerator.mjs')).href);
test('MRP and discount round using integer paise',()=>{
 assert.equal(price.discountFromPrices('185900','164990'),'11.25');
 assert.equal(price.priceFromDiscount('185900','11'),'165451.00');
 assert.equal(price.updatePricingDraft({mrp:'100',price:'80',pricingMode:'price'},'discount','15').price,'85.00');
});
test('supports 3 option dimensions (3 x 2 x 3)',()=>{
 const rows=gen.generateVariantMatrix({groups:[{name:'Color',values:'Black, Silver, Blue'},
  {name:'RAM',values:'8 GB, 16 GB'},{name:'Storage',values:'256 GB, 512 GB, 1 TB'}],skuPrefix:'LAP',
  defaultMrp:'90000',defaultPrice:'79999',defaultStock:'5'});
 assert.equal(rows.length,18);
 assert.ok(rows.find(v=>v.attributesText.includes('storage: 1 TB')&&v.attributesText.includes('ram: 16 GB')));
 assert.ok(rows.every(v=>v.mrp==='90000'));
});
test('rejects duplicate option values and excessive combinations',()=>{
 const opts={skuPrefix:'X',defaultMrp:'100',defaultPrice:'80',defaultStock:'0'};
 assert.throws(()=>gen.generateVariantMatrix({...opts,groups:[{name:'Color',values:'Black, black'}]}),/repeated/i);
 assert.throws(()=>gen.generateVariantMatrix({...opts,groups:[{name:'Color',values:'1,2,3,4,5,6,7,8,9,10,11'},
 {name:'Size',values:'1,2,3,4,5,6,7,8,9,10,11'}]}),/maximum|too many/i);
});
