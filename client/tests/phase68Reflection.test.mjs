import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('styles/phase68.css');

test('reflection is opt-in for customer login and registration, not admin/delivery logins',()=>{
 const layout=read('components/auth/AuthLayout.jsx');
 assert.match(layout,/reflection = false/);
 assert.match(layout,/nx68-auth-reflect/);
 assert.match(read('pages/auth/CustomerLogin.jsx'),/<AuthLayout reflection/);
 assert.match(read('pages/auth/CustomerSignup.jsx'),/<AuthLayout reflection/);
 assert.doesNotMatch(read('pages/delivery/DeliveryLogin.jsx'),/<AuthLayout reflection/);
});
test('real order cards and checkout submit button get reflection accents without changing order logic',()=>{
 assert.match(read('pages/customer/Orders.jsx'),/nx68-order-reflect/);
 assert.match(read('pages/customer/Checkout.jsx'),/nx68-order-action/);
 assert.match(read('pages/customer/Checkout.jsx'),/verifyRazorpayPayment/);
 assert.match(read('pages/customer/Checkout.jsx'),/createCodOrder/);
});
test('reflection styles load after established phase animations',()=>{
 const app=read('App.jsx');
 assert.match(app,/phase67\.css";[\s\S]*phase68\.css";/);
 assert.match(css,/\.nx68-order-reflect::after/);
 assert.match(css,/\.nx68-auth-reflect \.auth-card::after/);
 assert.match(css,/\.nx68-auth-reflect \.nx32-showcase-card::after/);
 assert.match(css,/\.nx68-order-action::after/);
});
test('reflection never steals clicks, excludes disabled submits, and respects reduced motion',()=>{
 assert.match(css,/pointer-events:\s*none/);
 assert.match(css,/:not\(:disabled\):is\(:hover, :focus-visible\)/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
 assert.match(css,/opacity:0!important/);
 assert.doesNotMatch(css,/setTimeout|setInterval|window\.Razorpay|order\.status\s*=/);
});
