import test from "node:test";
import assert from "node:assert/strict";
import {getOrderStageProgress,orderStages} from "../src/services/orderProgress.js";

test("timeline follows order state",()=>{
 assert.equal(orderStages.length,5);
 assert.deepEqual(getOrderStageProgress("shipped").completed,["placed","confirmed","processing","shipped"]);
 assert.equal(getOrderStageProgress("shipped").current,3);
});
test("cancelled state never appears as completed delivery",()=>{
 const state=getOrderStageProgress("cancelled");
 assert.equal(state.cancelled,true);
 assert.equal(state.current,-1);
 assert.deepEqual(state.completed,[]);
});
