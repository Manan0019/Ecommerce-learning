import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('manual image navigation pauses hover timer and reset happens only on leave',()=>{
 const card=src('components/common/ProductCard.jsx');
 assert.match(card,/function choose\(index\)\s*\{\s*stopPreview\(\)/);
 assert.match(card,/manuallyNavigated\.current = true/);
 assert.match(card,/if \(manuallyNavigated\.current\) return/);
});
test('footer ticker uses two identical traveling groups and supports custom image',()=>{
 const footer=src('components/layout/StoreFooter.jsx');const css=src('styles/site.css');
 assert.match(footer,/nx62-ticker-track/);assert.match(footer,/\{group\}\{group\}/);
 assert.match(css,/@keyframes nx62-ticker/);assert.match(css,/translateX\(-50%\)/);
 assert.match(footer,/content\.artworkUrl/);
});
test('admin footer editor, route and recently viewed shopping controls exist',()=>{
 const app=src('App.jsx');assert.ok(app.includes('/admin/footer'));
 assert.match(src('components/customer/RecentlyViewed.jsx'),/StorefrontCardActions/);
 assert.match(src('pages/admin/AdminFooter.jsx'),/uploadFooterArtwork/);
 const actions=src('components/customer/StorefrontCardActions.jsx');
 assert.doesNotMatch(actions,/needsOptions\?'Select options':'Quick Add'/);
});
