import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PAGE_SIZE,paginationModel} from '../src/components/ui/paginationModel.js';

test('default size, empty results and partial final page have accurate ranges',()=>{
  assert.equal(DEFAULT_PAGE_SIZE,10);
  assert.deepEqual(paginationModel({total:0}),{page:1,pages:1,total:0,pageSize:10,from:0,to:0});
  assert.deepEqual(paginationModel({total:23,page:3}),{page:3,pages:3,total:23,pageSize:10,from:21,to:23});
});
test('clamps invalid/deleted pages and supports server-provided totals without local records',()=>{
  assert.equal(paginationModel({page:-2,total:50}).page,1);
  assert.equal(paginationModel({page:7,total:11}).page,2);
  assert.deepEqual(paginationModel({page:12,total:239,pages:24}),{page:12,pages:24,total:239,pageSize:10,from:111,to:120});
});
