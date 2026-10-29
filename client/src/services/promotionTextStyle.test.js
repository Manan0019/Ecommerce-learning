import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPromotionTextStyle,promotionTextInlineStyle,promotionShadeStyle,promotionPositionPresets} from './promotionTextStyle.js';

test('legacy text overlay retains its old styles',()=>{
 assert.equal(promotionTextInlineStyle(null),undefined);
 assert.equal(promotionShadeStyle(null),undefined);
});
test('position and typography are applied to one banner only',()=>{
 const customized={...defaultPromotionTextStyle,anchor:'right',x:90,y:25,width:55,align:'right',titleSize:60};
 const css=promotionTextInlineStyle(customized);
 assert.equal(css.left,'90%');assert.equal(css.top,'25%');
 assert.equal(css.transform,'translate(-100%,-50%)');
 assert.equal(css.width,'55%');
 assert.equal(css['--nx-promo-title-size'],'60px');
 assert.equal(promotionTextInlineStyle(defaultPromotionTextStyle).left,'7%');
});
test('preset grid includes all nine positions',()=>{
 assert.equal(promotionPositionPresets.length,9);
 assert.deepEqual(new Set(promotionPositionPresets.map(row=>row[0])).size,9);
});
