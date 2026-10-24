import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const css = read('styles/site.css');
test('auth Explore the store opens homepage',()=>assert.match(read('components/auth/AuthLayout.jsx'),/to="\/" className="nx36-auth-explore"/));
test('notification badges are contained and independent of navigation glyph width',()=>{assert.match(css,/\.nx46-bell-count/);assert.match(css,/\.admin-nav a \.nx24-sidebar-count/);assert.match(css,/min-width:25px/);});
test("search icon visible, all-results remains full width and category suggestions remain linked", () => {
  const header=p88('src/components/layout/StoreHeader.jsx');const search=p88('src/components/ui/SearchField.jsx');assert.match(header,/SearchField/);assert.match(header,/getProductSuggestions/);assert.match(search,/<UiIcon name="search"/);assert.match(p88('src/styles/site.css'),/nx-search-view-all/);
});
test('promotion navigation uses accessible minimalist progress scrubber, autoplay, swipe and no arrow buttons',()=>{
 const s=read('components/customer/PromotionCarousel.jsx');
 assert.match(s,/nx52-promotion-progress/);assert.match(s,/aria-label=\{`Show promotion:/);
 assert.match(s,/onTouchStart=\{touchStart\}/);assert.match(s,/nx47-autoplay-toggle/);
 assert.doesNotMatch(s,/>←<|>→</);assert.match(css,/object-fit:cover!important/);
});
test('product gallery thumbnails have spacing and quantity control has rounded styling',()=>{
 assert.match(css,/\.nx29-gallery-thumbnails \{margin-top:22px!important/);
 assert.match(css,/\.purchase-row \.quantity-picker \{border-radius:15px!important/);
});
test("deep category promotions use bounded searchable selector for placement and destination", () => {
  const banner=p88('src/pages/admin/AdminBanners.jsx');const picker=p88('src/components/admin/PromotionCategorySelect.jsx');assert.match(banner,/Choose display category/);assert.match(banner,/Choose redirect category/);assert.match(picker,/categoryPaths\(categories\)/);assert.match(picker,/SearchField/);assert.match(picker,/nx52-category-drill/);
});
test('icons are vector paths, not unicode arrow glyphs in navigational JSX',()=>{
 const jsx=read('components/common/UiIcon.jsx');assert.match(jsx,/viewBox="0 0 24 24"/);
 assert.doesNotMatch(read('components/layout/StoreFooter.jsx'),/[↗←→]/);
 assert.doesNotMatch(read('components/customer/PromotionCarousel.jsx'),/[↗←→]/);
});
