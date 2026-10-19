import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryPaths,rootCategories } from './categoryHierarchy.js';
test('breadcrumbs distinguish identically named nested categories',()=>{
 const categories=[{id:'1',name:'Electronics',parentId:null},{id:'2',name:'Laptop',parentId:'1'}, {id:'3',name:'Fashion',parentId:null},{id:'4',name:'Accessories',parentId:'3'}];
 assert.equal(categoryPaths(categories)[1].path,'Electronics → Laptop');
 assert.deepEqual(rootCategories(categories).map(c=>c.name),['Electronics','Fashion']);
});
