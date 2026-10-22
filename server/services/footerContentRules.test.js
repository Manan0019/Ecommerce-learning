import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFooterContent,footerFromRow,DEFAULT_FOOTER} from './footerContentRules.js';
test('footer editor accepts bounded plain text',()=>{
 const valid=validateFooterContent({headlinePrimary:'  SHOP WELL ',headlineAccent:'NEXORA',tickerItems:[' LATEST ', 'SHOP SMART']});
 assert.deepEqual(valid,{headlinePrimary:'SHOP WELL',headlineAccent:'NEXORA',tickerItems:['LATEST','SHOP SMART']});
});
test('footer editor rejects markup, controls, and oversize text',()=>{
 for(const body of [
  {headlinePrimary:'<script>',headlineAccent:'TRUST',tickerItems:['VALID','WORDS']},
  {headlinePrimary:'HELLO',headlineAccent:'TRUST',tickerItems:['ONLY ONE']},
  {headlinePrimary:'HELLO',headlineAccent:'TRUST',tickerItems:['VALID','<img>']},
  {headlinePrimary:'HELLO',headlineAccent:'TRUST',tickerItems:Array(13).fill('VALID')},
 ]) assert.equal(validateFooterContent(body),null);
});
test('missing footer row uses safe default',()=>{assert.deepEqual(footerFromRow(null),DEFAULT_FOOTER);});
