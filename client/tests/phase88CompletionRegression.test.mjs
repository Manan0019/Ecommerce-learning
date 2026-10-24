import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { categoryTrail, categoryDepth } from '../src/components/admin/categoryPathHelpers.js';
import { paginationModel, DEFAULT_PAGE_SIZE } from '../src/components/ui/paginationModel.js';
import { readCompareIds, saveCompareProduct } from '../src/services/compareStorage.js';

const source = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('category ancestry handles nested and cyclic input without repeating nodes', () => {
  const categories = [{id:1,parentId:3,name:'Root'},{id:2,parentId:1,name:'Leaf'},{id:3,parentId:2,name:'Cycle'}];
  assert.deepEqual(categoryTrail(categories,2).map(c => c.id),[3,1,2]);
  assert.equal(categoryDepth(categories,2),3);
  assert.deepEqual(categoryTrail(categories,999),[]);
});

test('pagination defaults to ten and clamps on a deleted last page', () => {
  assert.equal(DEFAULT_PAGE_SIZE,10);
  assert.deepEqual(paginationModel({total:21,page:5}),{page:3,pages:3,total:21,pageSize:10,from:21,to:21});
  assert.deepEqual(paginationModel({total:0,page:7}),{page:1,pages:1,total:0,pageSize:10,from:0,to:0});
});

test('comparison persistence retains the four-product cap after helper extraction', () => {
  const original={storage:globalThis.localStorage,window:globalThis.window,Event:globalThis.Event};
  const data=new Map();
  globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
  globalThis.window={dispatchEvent:()=>{}};
  globalThis.Event=class { constructor(type){this.type=type;} };
  try {
    for(let id=1;id<=4;id++)assert.equal(saveCompareProduct({id}),'Added to compare');
    assert.equal(saveCompareProduct({id:2}),'Already in compare');
    assert.equal(saveCompareProduct({id:5}),'Compare up to four products.');
    assert.deepEqual(readCompareIds(),['1','2','3','4']);
  } finally {
    for(const [key,value] of Object.entries(original)){
      if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});

test('shared search component owns its sole magnifier', () => {
  const shared=source('components/ui/SearchField.jsx');
  const compare=source('pages/customer/Compare.jsx');
  assert.match(shared,/<UiIcon name="search"/);
  assert.match(compare,/<SearchField/);
  assert.doesNotMatch(compare,/<UiIcon\s+name="search"[^>]*\/>\s*<SearchField/);
});

test('review eligibility is tied to the current product and excludes stale requests', () => {
  const reviews=source('components/customer/ProductReviews.jsx');
  assert.match(reviews,/eligibility\.productId===productId/);
  assert.match(reviews,/!ctrl\.signal\.aborted/);
  assert.match(reviews,/!adminPreview&&reviewEligible/);
});

test('delivery assignment updates are explicitly refreshed by real-time events', () => {
  const dashboard=source('pages/delivery/DeliveryDashboard.jsx');
  assert.match(dashboard,/useRealtimeRevision/);
  assert.match(dashboard,/\[liveRevision, refresh\]/);
  assert.match(dashboard,/refresh\(controller\.signal\)/);
});
