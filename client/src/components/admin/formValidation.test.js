import test from "node:test";
import assert from "node:assert/strict";
import { guardNumberKey } from "./formValidation.js";
function simulated(key, step="1") {
  let blocked=false;
  guardNumberKey({ target: { tagName:"INPUT", type:"number", step }, key, preventDefault(){blocked=true;} });
  return blocked;
}
test("number fields reject exponent and negative signs",()=>{
 for(const key of ["e","E","-","+"]) assert.equal(simulated(key),true);
 assert.equal(simulated("3"),false);
 assert.equal(simulated("."),true);
 assert.equal(simulated(".","0.01"),false);
});
