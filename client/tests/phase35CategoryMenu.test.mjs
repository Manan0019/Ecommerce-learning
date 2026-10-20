import test from "node:test";
import assert from "node:assert/strict";
import {buildCategoryMenu} from "../src/components/layout/categoryMenuTree.js";

test("three nested levels stay reachable under their parent", () => {
  const data=[
    {id:"3",name:"Jeans",slug:"jeans",parentId:"2",isActive:true},
    {id:"1",name:"Fashion",slug:"fashion",parentId:null,isActive:true},
    {id:"2",name:"Bottomwear",slug:"bottomwear",parentId:"1",isActive:true},
  ];
  const tree=buildCategoryMenu(data);
  assert.equal(tree.length,1);
  assert.equal(tree[0].name,"Fashion");
  assert.equal(tree[0].children[0].name,"Bottomwear");
  assert.equal(tree[0].children[0].children[0].name,"Jeans");
});
test("inactive categories and their orphans are safely excluded", () => {
  const data=[{id:"1",name:"Fashion",isActive:false},{id:"2",name:"Jeans",parentId:"1",isActive:true}];
  assert.deepEqual(buildCategoryMenu(data).map(item => item.name), ["Jeans"]);
});
test("category order is stable and each category appears once", () => {
  const data=[{id:1,name:"Electronics"},{id:2,name:"Beauty"},{id:3,name:"Phones",parentId:1}];
  assert.deepEqual(buildCategoryMenu(data).map(item=>item.name), ["Beauty","Electronics"]);
  assert.equal(buildCategoryMenu(data)[1].children[0].name,"Phones");
});
