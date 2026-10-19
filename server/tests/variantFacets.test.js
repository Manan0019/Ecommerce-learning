import assert from 'node:assert/strict';
import test from 'node:test';
import { buildVariantFacets, matchesVariantFacets } from '../services/variantFacets.js';

test('jeans with one colour but several sizes exposes Size rather than pointless Color filter', () => {
  const facets = buildVariantFacets([
    { variant_attributes: [{ size: '30', color: 'Navy' }, { size: '32', color: 'Navy' }, { size: '34', color: 'Navy' }] }
  ]);
  assert.deepEqual(facets.map(f => f.key), ['variant_size']);
  assert.deepEqual(facets[0].options.map(f => f.label), ['30', '32', '34']);
});
test('nested-category candidate variants produce Size, RAM, Storage, Color facets dynamically', () => {
  const facets = buildVariantFacets([
    { variant_attributes: [{ size: 'S', color: 'Blue', ram: '8 GB', storage: '128 GB' }] },
    { variant_attributes: [{ size: 'M', color: 'Red', ram: '16 GB', storage: '256 GB' }] }
  ]);
  assert.deepEqual(facets.map(f => f.label), ['Size', 'Color', 'RAM', 'Storage']);
});
test('matching size and colour must belong to same SKU', () => {
  const filters = [{attributeKey: 'size', values: ['32']},{attributeKey: 'color', values: ['Blue']}];
  assert.equal(matchesVariantFacets({size:'30',color:'Blue'},filters),false);
  assert.equal(matchesVariantFacets({size:'32',color:'Navy'},filters),false);
  assert.equal(matchesVariantFacets({size:'32',color:'Blue'},filters),true);
});
test('invalid variant attribute names cannot generate query keys', () => {
  assert.equal(buildVariantFacets([{ variant_attributes: [{ 'size); DROP TABLE products': '30', size:'30' }, {size:'32'}] }]).length,1);
});
