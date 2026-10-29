import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePromotionTextStyle,DEFAULT_PROMOTION_TEXT_STYLE} from '../services/promotionTextStyle.js';
test('legacy banners remain uncustomized',()=>{
 assert.equal(parsePromotionTextStyle(null),null);
 assert.equal(parsePromotionTextStyle(undefined),null);
 assert.equal(parsePromotionTextStyle("null"),null);
});
test('valid FormData JSON gets bounded defaults',()=>{
 const result=parsePromotionTextStyle(JSON.stringify({x:48,y:30,align:'center',titleSize:70,ctaText:'Shop now',titleColor:'#FF0000'}));
 assert.deepEqual(result,{...DEFAULT_PROMOTION_TEXT_STYLE,x:48,y:30,align:'center',titleSize:70,ctaText:'Shop now',titleColor:'#FF0000'});
});
test('invalid or dangerous visual values are rejected',()=>{
 for(const value of ['oops','[]','{"x":999}', '{"titleColor":"url(javascript:bad)"}', '{"fontFamily":"Papyrus"}', '{"ctaText":"x\\nhi"}', '{"anchor":"bogus"}', {titleWeight:455}, {ctaVisible:'false'}, {__proto__:null,invalidKey:true}]){
  assert.equal(parsePromotionTextStyle(value),undefined);
 }
});
