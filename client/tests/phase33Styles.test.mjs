import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','src');
const app=readFileSync(resolve(root,'App.jsx'),'utf8');
const styles=readFileSync(resolve(root,'styles','phase33.css'),'utf8');
const related=readFileSync(resolve(root,'components','customer','RelatedProducts.jsx'),'utf8');
test('final stylesheet loads after older input-focus rules',()=>{
 assert.ok(app.indexOf('styles/phase32.css')<app.indexOf('styles/phase33.css'));
 assert.match(styles,/\.nx32-price-input-wrap input:focus-visible/);
 assert.match(styles,/\.nx32-price-input-wrap:focus-within/);
});
test('recommendations provide retry and browse fallback, not silent disappearance',()=>{
 assert.match(related,/Try again/);
 assert.match(related,/Explore all products/);
 assert.match(related,/Browse the collection/);
});
