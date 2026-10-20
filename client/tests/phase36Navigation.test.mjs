import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCategoryMenu} from '../src/components/layout/categoryMenuTree.js';

const source = (f) => readFileSync(new URL(f, import.meta.url),'utf8');
test('nested categories keep their separate navigation icons',()=>{
  const roots=buildCategoryMenu([
    {id:'1',name:'Fashion',slug:'fashion',isActive:true,imageUrl:'/uploads/categories/cover.webp',menuIconUrl:'/uploads/categories/menu.webp'},
    {id:'2',name:'Jeans',slug:'jeans',isActive:true,parentId:'1',menuIconUrl:'/uploads/categories/jeans.webp'},
  ]);
  assert.equal(roots.length,1);
  assert.equal(roots[0].imageUrl,'/uploads/categories/cover.webp');
  assert.equal(roots[0].menuIconUrl,'/uploads/categories/menu.webp');
  assert.equal(roots[0].children[0].menuIconUrl,'/uploads/categories/jeans.webp');
});
test('header keeps logo home link, removes Home navigation and offers expanded search',()=>{
  const head=source('../src/components/layout/StoreHeader.jsx');
  assert.match(head,/className="brand" to="\/"/);
  assert.doesNotMatch(head,/<NavLink to="\/"/);
  const css=source('../src/styles/phase36.css');
  assert.match(css,/\.nx-nav-search\{flex:1 1 auto;width:auto;max-width:none/);
});
test('category menu uses database icon, one button trigger and no chevron toggle',()=>{
  const code=source('../src/components/layout/CategoryMegaMenu.jsx');
  assert.match(code,/iconUrl=\{category\.menuIconUrl\}/);
  assert.match(code,/aria-expanded=\{open\}/);
  assert.doesNotMatch(code,/<button className="nx35-menu-toggle"/);
  assert.doesNotMatch(code,/const id = normalize\(/);
});
test('banner image-only mode retains full artwork with short height and no dark overlay',()=>{
  const code=source('../src/components/customer/PromotionCarousel.jsx');
  assert.match(code,/nx37-promotion-image-frame/);
  assert.match(code,/is-image-only/);
  assert.match(code,/imageOnly &&/);
  const css=source('../src/styles/phase36.css');
  assert.match(css,/object-fit:contain!important/);
  assert.match(css,/height:clamp\(145px,19vw,270px\)/);
});
test('admin form exposes two independent category image upload slots',()=>{
  const code=source('../src/pages/admin/AdminCategories.jsx');
  assert.match(code,/formData.append\("image", image\)/);
  assert.match(code,/formData.append\("menuIcon", menuIcon\)/);
  assert.match(code,/Collection image/);
  assert.match(code,/Dropdown menu icon/);
});
test('login browse action has been relocated away from login form',()=>{
  assert.doesNotMatch(source('../src/pages/auth/CustomerLogin.jsx'),/Continue shopping without signing in/);
  assert.match(source('../src/components/auth/AuthLayout.jsx'),/className="nx36-auth-explore"/);
});
