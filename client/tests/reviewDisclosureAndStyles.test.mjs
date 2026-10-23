import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const client=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read=relative=>readFileSync(path.join(client,relative),'utf8');

test('review disclosure stays collapsed until opened by its native summary',()=>{
  const source=read('src/components/customer/ProductReviews.jsx');
  assert.match(source,/<details className="nx61-review-form nx64-review-form"/);
  assert.doesNotMatch(source,/<details[^>]*\sopen(?:\s|>|=)/);
  assert.match(source,/onToggle=\{event=>setReviewOpen\(event\.currentTarget\.open\)\}/);
  assert.match(source,/UiIcon name="chevron-down"/);
  assert.match(source,/reviewOpen\?'Hide review':'Write a review'/);
  assert.match(source,/<form onSubmit=\{submit\}>/);
});

test('curved review action sweeps counter-clockwise with theme contrast and no underline',()=>{
  const styles=read('src/styles/modules/customer/product-reviews.css');
  assert.match(styles,/rotate\(-360deg\)/);
  assert.match(styles,/linear-gradient\(145deg,#896af3/);
  assert.match(styles,/color:white!important/);
  assert.match(styles,/\.nx-review-heading::after/);
  assert.match(styles,/\.nx-review-action-copy::after/);
  assert.match(styles,/\.nx64-review-form\[open\].*\.nx-review-action>svg\{transform:rotate\(180deg\)/);
  assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});

test('styling is authored in purpose-named modules and built into the compatible site bundle',()=>{
  const script=read('scripts/build-styles.mjs');
  const root=path.join(client,'src/styles');
  assert.deepEqual(readdirSync(root).filter(x=>x.endsWith('.css')), ['site.css']);
  assert.match(script,/modules\/customer\/product-reviews\.css/);
  assert.match(script,/modules\/foundation\/reset\.css/);
  assert.match(script,/modules\/layouts\/admin-workspace\.css/);
  assert.match(script,/modules\/admin\/shipping-settings\.css/);
  const main=read('src/main.jsx');
  assert.match(main,/import '\.\/styles\/site\.css'/);
  const bundle=read('src/styles/site.css');
  assert.ok(bundle.endsWith(read('src/styles/modules/customer/product-reviews.css')));
  const manifest=read('package.json');
  assert.match(manifest,/"predev": "node scripts\/build-styles\.mjs"/);
  assert.match(manifest,/"prebuild": "node scripts\/build-styles\.mjs"/);
});
