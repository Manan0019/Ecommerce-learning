import test from "node:test";
import assert from "node:assert/strict";
import {visiblePromotionWindow,movePromotionSlide,promotionDotIndices} from "../src/services/promotionCarouselRules.js";
test("4, 5 and 6 desktop positions show unique banners",()=>{
 const all=Array.from({length:9},(_,i)=>({id:String(i+1)}));
 for(const n of [4,5,6]){
  const visible=visiblePromotionWindow(all,3,n);
  assert.equal(visible.length,n);
  assert.equal(new Set(visible.map(item=>item.id)).size,n);
 }
});
test("unbounded banner list rotates and wraps without losing scheduled ordering",()=>{
 const all=Array.from({length:25},(_,i)=>i+1);
 assert.deepEqual(visiblePromotionWindow(all,24,4),[25,1,2,3]);
 assert.equal(movePromotionSlide(24,1,25),0);
 assert.equal(movePromotionSlide(0,-1,25),24);
 assert.deepEqual(visiblePromotionWindow(all,0,6),[1,2,3,4,5,6]);
});
test("no banners, one banner and invalid requested counts are safe",()=>{
 assert.deepEqual(visiblePromotionWindow([],0,6),[]);
 assert.deepEqual(visiblePromotionWindow(["a"],2,6),["a"]);
 assert.equal(movePromotionSlide(7,1,0),0);
 assert.deepEqual(visiblePromotionWindow([1,2,3],0,999),[1,2,3]);
});

test("large seasonal campaign displays a bounded number of navigation dots",()=>{
 assert.deepEqual(promotionDotIndices(3,2),[0,1,2]);
 const dots=promotionDotIndices(100,0);
 assert.equal(dots.length,7);
 assert.equal(new Set(dots).size,7);
 assert.ok(dots.includes(0));
 assert.deepEqual(promotionDotIndices(0,0),[]);
});
