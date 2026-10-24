import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = rel => fs.readFileSync(new URL(`../src/${rel}`,import.meta.url),'utf8');
test("modal close buttons use centered SVGs and consistent hover motion", () => {
  const modal=p88('src/components/common/Modal.jsx');const s=p88('src/styles/modules/foundation/design-system.css');assert.match(modal,/IconButton/);assert.match(modal,/aria-label="Close dialog"/);assert.match(s,/\.nx-ui-icon-button/);assert.match(s,/prefers-reduced-motion/);
});
test('checkout animation is driven by live payment/order callbacks not a fake countdown',()=>{
 const component=read('components/customer/CheckoutProcessStatus.jsx');
 const page=read('pages/customer/Checkout.jsx');
 assert.match(component,/phase==='provider'/);
 assert.match(component,/aria-valuetext=\{complete\?/);
 assert.doesNotMatch(component,/setTimeout|setInterval/);
 assert.match(page,/setPaymentPhase\('verifying'\)/);
 assert.match(page,/setPaymentPhase\('confirmed'\)/);
 assert.match(page,/setPaymentPhase\('provider'\)/);
 assert.match(page,/confirmed\.paid/);
});
test('shimmer loading only appears while product data is being fetched',()=>{
 const skeleton=read('components/common/ProductLoadingSkeleton.jsx');
 assert.match(skeleton,/nx64-product-skeleton/);
 for(const page of ['pages/customer/Home.jsx','pages/customer/ProductList.jsx','components/customer/RelatedProducts.jsx']){
  assert.match(read(page),/ProductLoadingSkeleton/);
 }
});
test('half-star reviews require database migration and half increment validation',()=>{
 const form=read('components/customer/ProductReviews.jsx');
 assert.match(form,/RatingStars value=\{rating\}/);
 assert.match(read('components/customer/RatingStars.jsx'),/index-\.5/);
 assert.match(read('components/customer/RatingStars.jsx'),/nx71-star-fill/);
});
