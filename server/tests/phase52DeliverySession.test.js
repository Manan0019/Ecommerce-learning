import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deliveryAccessDecision} from '../services/deliverySessionRules.js';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
test('only active delivery role may sign in as courier',()=>{
 assert.deepEqual(deliveryAccessDecision('delivery',true),{ok:true,status:200,message:null});
 assert.equal(deliveryAccessDecision('delivery',false).status,403);
 assert.equal(deliveryAccessDecision('admin',true).status,403);
 assert.equal(deliveryAccessDecision('customer',true).status,403);
});
test('courier login validates active profile before session regeneration',()=>{
 const auth=read('../routes/authRoutes.js');
 assert.match(auth,/deliveryAccessDecision\(user.role/);
 assert.ok(auth.indexOf('deliveryAccessDecision(user.role')<auth.indexOf('req.session.regenerate'));
});
test('delivery session and assignment routes require delivery middleware',()=>{
 const delivery=read('../routes/deliveryRoutes.js');
 assert.match(delivery,/delivery\.use\(requireDelivery\)/);
 assert.match(delivery,/delivery\.get\('\/session'/);
 assert.match(delivery,/delivery\.get\('\/assignments'/);
});
