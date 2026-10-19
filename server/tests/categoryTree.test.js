import test from 'node:test';import assert from 'node:assert/strict';
import {withDescendantCounts} from '../services/categoryTree.js';
test('parent counts products in nested subcategories once',()=>{
 const a=withDescendantCounts([{id:'1',parentId:null,productCount:0},{id:'2',parentId:'1',productCount:2},{id:'3',parentId:'2',productCount:3}]);
 assert.equal(a[0].productCount,5);assert.equal(a[1].productCount,5);assert.equal(a[2].productCount,3);
});
