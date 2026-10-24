import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {browserSession} from './browser-session.mjs';
const browser=await browserSession(),{send,evaluate,until}=browser;
const errors=[],unknown=new Set();
let role='admin';
const products=Array.from({length:23},(_,i)=>({id:i+1,name:`Nexora Product ${i+1}`,brand:'Nexora',category:'Electronics',price:1299,mrp:1599,stock:15,displayStock:15,isActive:true,showSaleBadge:i%2===0,imageUrl:'',hasVariants:false}));
const categories=Array.from({length:12},(_,i)=>({id:i+1,name:`Collection ${i+1}`,slug:`collection-${i+1}`,parentId:null,isActive:true,productCount:5}));
const staff=Array.from({length:13},(_,i)=>({id:i+1,fullName:`Executive ${i+1}`,email:`executive${i+1}@example.test`,mobile:'9876543210',mobileNumber:'9876543210',isActive:true,payRate:55,openDeliveries:2,totalAssignments:1}));
const assignments=Array.from({length:12},(_,i)=>({orderId:i+1,executiveId:1,executiveName:'Executive 1',customerName:`Customer ${i+1}`,deliveryStatus:'assigned',orderStatus:'confirmed',status:'confirmed',address:{city:'Ahmedabad',fullName:`Customer ${i+1}`,addressLine1:'Sample address',state:'Gujarat',pincode:'380001',phone:'9876543210'},items:[{name:'Product',quantity:1}],total:1299,paymentMethod:'cod',paymentStatus:'cod_pending',assignedAt:'2026-10-20T10:00:00Z',payRate:55}));
function response(url){
 const {pathname:p,searchParams:q}=new URL(url),page=Number(q.get('page')||1),query=(q.get('q')||q.get('search')||'').toLowerCase();
 const found=products.filter(x=>x.name.toLowerCase().includes(query)),slice=found.slice((page-1)*10,page*10);
 if(['/api/auth/me','/api/admin/me','/api/delivery/session'].includes(p))return {user:{id:1,fullName:'Preview User',email:'preview@example.test',role}};
 if(p==='/api/admin/products')return {products:slice,total:found.length,facets:{categories:['Electronics'],brands:['Nexora']},summary:{total:23,active:23,inactive:0}};
 if(p==='/api/products')return {products:slice,facets:[],pagination:{page,pages:Math.ceil(found.length/10),total:found.length,limit:10},priceBounds:{min:0,max:2000}};
 if(p==='/api/admin/featured')return {products:products.slice(0,12)};
 if(p==='/api/admin/featured/candidates')return {products:slice,total:found.length};
 if(['/api/admin/categories','/api/categories'].includes(p))return {categories};
 if(p==='/api/admin/customers')return {customers:Array.from({length:10},(_,i)=>({id:i+1,fullName:`Customer ${i+1}`,email:`customer${i+1}@example.test`,createdAt:'2026-10-20'})),total:23};
 if(p==='/api/admin/inventory/low-stock')return {summary:{total:23,outOfStock:4,lowStock:19},items:products.map(x=>({productId:x.id,productName:x.name,sku:`SKU-${x.id}`,available:3,threshold:5}))};
 if(p==='/api/admin/delivery/health')return {ready:true};
 if(p==='/api/admin/delivery/staff')return {staff};
 if(p.endsWith('/assignments'))return {assignments};
 if(p.includes('/earnings'))return {summary:{earnedPaise:12500,completed:3},rows:assignments};
 if(p.includes('/collections'))return {summary:{},rows:[]};
 if(p==='/api/admin/orders')return {orders:[],pagination:{total:0,page:1,pages:1}};
 if(p.includes('notifications'))return {notifications:[],unread:0};
 if(p.includes('branding'))return {};
 if(p.includes('/banners'))return {banners:[],homeVisibleCount:3,homeAutoplay:true,homeRotateSeconds:5};
 if(p.includes('reviews'))return {reviews:[],count:0,average:0};
 if(p.includes('footer'))return {footer:{}};
 if(p.includes('wishlist'))return {products:[]};
 if(p.includes('storefront-copy'))return {copy:{}};
 if(p.includes('coupons'))return {coupons:[],redemptionEnabled:true,targets:products};
 unknown.add(p);return {};
}
browser.on('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text));
browser.on('Fetch.requestPaused',async event=>{
 const {requestId,request}=event;
 // Every API response is synthetic; no production/local data or mutations are used.
 const headers=[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://127.0.0.1:5175'},{name:'Access-Control-Allow-Credentials',value:'true'},{name:'Access-Control-Allow-Headers',value:'Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET,POST,PATCH,PUT,DELETE,OPTIONS'}];
 try {await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:headers,body:Buffer.from(JSON.stringify(response(request.url))).toString('base64')});}
 catch(error){if(!error.message.includes('Invalid InterceptionId'))errors.push(error.message);}
});
try{
 await send('Fetch.enable',{patterns:[{urlPattern:'*/api/*'}]});
 mkdirSync('.ui-artifacts',{recursive:true});
 const routes=[['/admin/products','.admin-product-table'],['/admin/categories','.nx69-category-table'],['/admin/featured','.nx24-featured-list'],['/admin/inventory','.nx84-inventory-table'],['/admin/customers','.nx74-customer-tools'],['/admin/delivery','.nx86-staff-directory'],['/admin/finance','.nx81-finance'],['/admin/reviews','.nx61-review-moderation'],['/products','.product-grid'],['/login','.auth-form'],['/delivery/dashboard','.nx52-delivery-work']];
 for(const [route,selector] of routes.filter(([route])=>!process.argv[2]||route===process.argv[2])){
  role=route.startsWith('/delivery/')?'delivery':route.startsWith('/admin/')?'admin':'customer';
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5175'+route});
  await until(`document.querySelector(${JSON.stringify(selector)})`,15000);
  await new Promise(r=>setTimeout(r,400));
  const searchCheck=await evaluate(`Array.from(document.querySelectorAll('.nx-ui-search-field')).every(el=>{const input=el.querySelector('input'),icon=el.querySelector(':scope > svg');return icon&&icon.getBoundingClientRect().right<=input.getBoundingClientRect().left})`);
  assert.ok(searchCheck,`${route}: search icon overlap`);
  const heights=await evaluate(`Array.from(document.querySelectorAll('select:not([multiple]):not([size])')).map(el=>el.getBoundingClientRect().height).filter(Boolean)`);
  assert.ok(heights.every(h=>h===44),`${route}: inconsistent dropdown heights ${heights}`);
  for(const width of [1440,390]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
   await new Promise(r=>setTimeout(r,350));
   const overflow=await evaluate('document.documentElement.scrollWidth>innerWidth');
   if(overflow)console.log('OVERFLOW',route,width,await evaluate(`Array.from(document.querySelectorAll('body *')).filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+1&&!el.closest('.nx-ui-table-container')}).slice(0,8).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width}))`));
   if(process.argv[3]==='--inspect')console.log(await evaluate(`Array.from(document.querySelectorAll('.admin-sidebar,.admin-mobile-toggle,.catalogue-results-bar,.catalogue-results-bar label,.nx24-jump')).slice(0,5).map(el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return {class:el.className,left:r.left,right:r.right,height:r.height,width:r.width,flex:c.flex,display:c.display,direction:c.flexDirection,transform:c.transform,overflow:c.overflow}})`));
   const screenshot=await send('Page.captureScreenshot',{format:'png'});
   writeFileSync(`.ui-artifacts/${route.replaceAll('/','_')}-${width}.png`,Buffer.from(screenshot.data,'base64'));
  }
  console.log('Checked',route);
 }
 assert.deepEqual(errors,[]);
 console.log('Workspace render checks complete. Unused mock endpoints:',[...unknown]);
}finally{await send('Fetch.disable');browser.close();}
