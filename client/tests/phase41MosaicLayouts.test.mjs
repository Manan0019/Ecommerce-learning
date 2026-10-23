import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css = readFileSync(new URL('../src/styles/site.css',import.meta.url),'utf8');
const component = readFileSync(new URL('../src/components/customer/PromotionCarousel.jsx',import.meta.url),'utf8');
const admin = readFileSync(new URL('../src/pages/admin/AdminBanners.jsx',import.meta.url),'utf8');

test('original three-banner editorial composition remains controlled by Phase 37',()=>{
  assert.doesNotMatch(css,/\.nx41-multi-banner\.nx37-count-3\b/);
  assert.match(component,/count>3\?" nx41-multi-banner"/);
});
test('four banners use a two-column two-row grid',()=>{
  assert.match(css,/\.nx41-multi-banner\.nx37-count-4\s*\{\s*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
});
test('five banners feature one tall editorial lead with four neighbours',()=>{
  assert.match(css,/\.nx41-multi-banner\.nx37-count-5\s*\{\s*grid-template-columns:\s*minmax\(0,1\.35fr\)\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.nx37-count-5 \.nx37-promotion-card:first-child\s*\{\s*grid-column:\s*1;\s*grid-row:\s*1 \/ span 2/);
});
test('six banners use two wide features above four smaller tiles',()=>{
  assert.match(css,/\.nx41-multi-banner\.nx37-count-6\s*\{\s*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css,/\.nx37-count-6 \.nx37-promotion-card:nth-child\(1\)\s*\{\s*grid-column:\s*1 \/ span 2/);
  assert.match(css,/\.nx37-count-6 \.nx37-promotion-card:nth-child\(2\)\s*\{\s*grid-column:\s*3 \/ span 2/);
});
test('tablet and phone get dedicated layouts; image-only cards remain bright',()=>{
  assert.match(css,/@media \(min-width:721px\) and \(max-width:1100px\)/);
  assert.match(css,/@media \(max-width:720px\)/);
  assert.match(css,/\.nx37-promotion-card\.is-image-only img\s*\{\s*object-fit:\s*contain/);
  assert.match(css,/nth-child\(n\+2\)\s*\{\s*display:\s*none/);
});
test('promotions studio explains and previews all arrangements',()=>{
  for (const label of ['4 · 2 × 2 balanced','5 · Featured + 4 mosaic','6 · Twin features + 4 tiles']) {
    assert.ok(admin.includes(label),`Missing admin layout option: ${label}`);
  }
  assert.match(admin,/PromotionLayoutPreview count=\{homeCount\}/);
  assert.match(css,/\.nx41-admin-preview-6>span:nth-child\(2\)/);
});
test('no pointless shuffle when all banners already visible on desktop',()=>{
  assert.match(component,/const canAdvance = banners\.length > \(phoneView \? 1 : visibleCount\)/);
  assert.match(component,/\|\| !canAdvance\) return/);
});
