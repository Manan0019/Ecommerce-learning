import test from "node:test";
import assert from "node:assert/strict";
import { moveSelectedMedia } from "./mediaSelectionOrder.js";
const items=[1,2,3,4,5].map(id=>({id}));
test("selected media move together and keep their original order",()=>{
 assert.deepEqual(moveSelectedMedia(items,[2,4],5).map(x=>x.id),[1,3,2,4,5]);
 assert.deepEqual(moveSelectedMedia(items,[2,4],null,"last").map(x=>x.id),[1,3,5,2,4]);
 assert.deepEqual(moveSelectedMedia(items,[2,4],null,"first").map(x=>x.id),[2,4,1,3,5]);
});
test("dragging into itself preserves order",()=>{
 assert.deepEqual(moveSelectedMedia(items,[2,4],4).map(x=>x.id),[1,2,3,4,5]);
});
