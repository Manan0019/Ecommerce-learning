import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardGalleryImages, canPreviewGallery, galleryIndex } from '../src/components/common/cardGallery.js';
const source = relative => readFileSync(new URL('../src/' + relative, import.meta.url), 'utf8');

test('two valid images enable gallery controls and wrap in both directions', () => {
  const images = cardGalleryImages({imageUrl:'/a.webp',previewImages:['/a.webp','/b.webp']});
  assert.deepEqual(images,['/a.webp','/b.webp']);
  assert.equal(canPreviewGallery(images), true);
  assert.equal(galleryIndex(1,2),1);
  assert.equal(galleryIndex(2,2),0);
  assert.equal(galleryIndex(-1,2),1);
});
test('duplicate and failed images never leave a fake two-image gallery', () => {
  const card={previewImages:[' /a.webp ','/a.webp','/b.webp','/b.webp']};
  assert.deepEqual(cardGalleryImages(card), ['/a.webp','/b.webp']);
  assert.equal(canPreviewGallery(cardGalleryImages(card,['/b.webp'])),false);
  assert.deepEqual(cardGalleryImages({imageUrl:'/cover.webp'}),['/cover.webp']);
});
test('card uses real pointer hover, accessible arrows and a gallery for two images', () => {
  const card=source('components/common/ProductCard.jsx');
  assert.match(card,/onPointerEnter/);
  assert.match(card,/canPreviewGallery\(availableImages\)/);
  assert.match(card,/Previous image for/);
  assert.match(card,/Next image for/);
  assert.doesNotMatch(card,/hover: hover/);
});
test('policy links have consistent hover and focus underline treatment', () => {
  const jsx=source('pages/public/StorePolicy.jsx');
  const css=source('styles/modules/commerce/launch-policies.css');
  assert.match(jsx,/nx83-policy-support-link/);
  assert.match(jsx,/aria-current/);
  assert.match(css,/nx83-policy-animated-link:.*focus-visible/);
  assert.match(css,/scaleX\(0\)/);
  assert.match(css,/scaleX\(1\)/);
});
test('all gallery cards share a subtle photo hover, no single-image sweep', () => {
  const css=source('styles/modules/foundation/interactive-controls.css');
  assert.match(css,/nx29-card-stage:hover \.nx29-card-image/);
  assert.match(css,/nx77-single-image::after\{content:none/);
});
