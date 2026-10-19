import test from 'node:test';
import assert from 'node:assert/strict';
import {orderFeaturedIds,isExactFeaturedReorder} from '../services/featuredOrdering.js';
test('new featured items append without collisions',()=>assert.deepEqual(orderFeaturedIds(['3','5'],'9',true),['3','5','9']));
test('requested placement shifts existing products',()=>assert.deepEqual(orderFeaturedIds(['3','5','9'],'9',true,1),['9','3','5']));
test('removing featured item preserves ordering',()=>assert.deepEqual(orderFeaturedIds(['3','5','9'],'5',false),['3','9']));
test('reorder requires identical unique ids',()=>{
 assert.equal(isExactFeaturedReorder(['1','2'],['2','1']),true);
 assert.equal(isExactFeaturedReorder(['1','2'],['2','2']),false);
 assert.equal(isExactFeaturedReorder(['1','2'],['1','3']),false);
});
