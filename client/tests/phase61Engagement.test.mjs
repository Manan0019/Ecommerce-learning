import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('product cards include quick view, wishlist, compare, and variant-safe add',()=>{
 const card=source('../src/components/common/ProductCard.jsx'), actions=source('../src/components/customer/StorefrontCardActions.jsx');
 assert.match(card,/StorefrontCardActions/);
 for(const text of ['Quick view','Add to wishlist','Add to compare','Quick Add','needsOptions'])assert.ok(actions.includes(text));
 assert.match(actions,/product\.hasVariants && !product\.selectedVariantId/);
});
test('phase61 routes include real review and FAQ pages',()=>{
 const app=source('../src/App.jsx');for(const path of ['/compare','/faq','/admin/reviews'])assert.ok(app.includes(path));
 assert.match(source('../src/pages/customer/ProductDetails.jsx'),/ProductReviews/);
});
test('newsletter popup requires opt-in and is dismissible',()=>{
 const file=source('../src/components/customer/NewsletterPopup.jsx');
 assert.match(file,/consent:true/);assert.match(file,/30\*86400000/);assert.match(file,/No thanks/);
});
test('manual sale label is not automatic for every discounted product',()=>{
 const card=source('../src/components/common/ProductCard.jsx');assert.match(card,/product\.showSaleBadge/);
 assert.match(source('../src/pages/admin/AdminProducts.jsx'),/Show sale/);
});
test('website FAQ and footer linking are present',()=>{
 assert.ok(existsSync(new URL('../src/pages/public/Faq.jsx',import.meta.url)));
 assert.match(source('../src/components/layout/StoreFooter.jsx'),/\/faq/);
});
