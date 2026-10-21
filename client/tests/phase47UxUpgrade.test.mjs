import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const css = read('styles/phase47.css');
test('auth Explore the store opens homepage',()=>assert.match(read('components/auth/AuthLayout.jsx'),/to="\/" className="nx36-auth-explore"/));
test('notification badges are contained and independent of navigation glyph width',()=>{assert.match(css,/\.nx46-bell-count/);assert.match(css,/\.admin-nav a \.nx24-sidebar-count/);assert.match(css,/min-width:25px/);});
test('search icon visible, all-results remains full width and category suggestions remain linked',()=>{
 const source=read('components/layout/StoreHeader.jsx');assert.match(source,/function SearchIcon\(\).*UiIcon name="search"/);
 assert.match(source,/getProductSuggestions/);assert.match(css,/\.nx-search-view-all \{[^}]*width:100%!important/);
});
test('promotion navigation uses accessible numbered segments, autoplay, swipe and no arrow buttons',()=>{
 const s=read('components/customer/PromotionCarousel.jsx');
 assert.match(s,/nx47-promotion-segments/);assert.match(s,/aria-label=\{`Show promotion set/);
 assert.match(s,/onTouchStart=\{touchStart\}/);assert.match(s,/nx47-autoplay-toggle/);
 assert.doesNotMatch(s,/>←<|>→</);assert.match(css,/object-fit:cover!important/);
});
test('product gallery thumbnails have spacing and quantity control has rounded styling',()=>{
 assert.match(css,/\.nx29-gallery-thumbnails \{margin-top:22px!important/);
 assert.match(css,/\.purchase-row \.quantity-picker \{border-radius:15px!important/);
});
test('deep category promotions use bounded searchable selector for placement and destination',()=>{
 const s=read('pages/admin/AdminBanners.jsx');const picker=read('components/admin/PromotionCategorySelect.jsx');
 assert.match(s,/Choose display category" categories=\{categories\}/);assert.match(s,/Choose redirect category" categories=\{categories\}/);
 assert.match(picker,/categoryPaths\(categories\)/);assert.match(picker,/type="search"/);
 assert.match(picker,/role="listbox"/);assert.match(css,/max-height:min\(32vh,270px\)/);
});
test('icons are vector paths, not unicode arrow glyphs in navigational JSX',()=>{
 const jsx=read('components/common/UiIcon.jsx');assert.match(jsx,/viewBox="0 0 24 24"/);
 assert.doesNotMatch(read('components/layout/StoreFooter.jsx'),/[↗←→]/);
 assert.doesNotMatch(read('components/customer/PromotionCarousel.jsx'),/[↗←→]/);
});
