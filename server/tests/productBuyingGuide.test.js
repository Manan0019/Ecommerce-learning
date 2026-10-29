import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBuyingGuide,hasBuyingGuideContent} from '../services/productBuyingGuide.js';

test('an empty guide remains optional', () => {
  assert.deepEqual(validateBuyingGuide(undefined), {});
  assert.deepEqual(validateBuyingGuide('{}'), {});
  assert.deepEqual(validateBuyingGuide({kind:'beauty'}), {});
});
test('saves safe, bounded clothing charts and FAQs', () => {
  const guide=validateBuyingGuide(JSON.stringify({kind:'clothing',sizeChart:{columns:['Size','Chest (cm)'],rows:[['S','90'],['M','98']],note:'Measure the garment'},faqs:[{question:'Is it washable?',answer:'Follow the care label.'}]}));
  assert.equal(guide.kind,'clothing');
  assert.equal(guide.sizeChart.rows.length,2);
  assert.equal(hasBuyingGuideContent(guide),true);
});
test('rejects invalid or oversized fields and malformed rows', () => {
  for(const input of [
    '{not-json}', {kind:'fake',introduction:'test'},
    {kind:'clothing',sizeChart:{columns:['Size','Length'],rows:[['S']]}},
    {faqs:[{question:'missing answer'}]},
    {compatibility:{models:Array.from({length:31},()=> 'x')}},
    {introduction:'a'.repeat(801)},
    {kind:'general',sizeChart:{columns:['Only'],rows:[]}},
    []
  ]) assert.throws(()=>validateBuyingGuide(input),/INVALID_BUYING_GUIDE/);
});
