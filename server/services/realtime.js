// Phase 85: server-authoritative invalidations. No business data or secrets ride on the socket.
import { Server } from 'socket.io';
import pool from '../config/db.js';
import { sessionMiddleware } from '../config/session.js';

let io = null;
const personalRoom = id => `user:${String(id)}`;
const VALID = new Set(['catalog','inventory','orders','delivery','finance','notifications','analytics','promotions','branding','customers','reviews','cart','wishlist']);
export function broadcastArea(area, room='public') {
  if (!io || !VALID.has(area)) return;
  io.to(room).emit('nexora:invalidate', { area, at: Date.now() });
}
export function broadcastAreas(areas, room) { for (const area of new Set(areas)) broadcastArea(area,room); }
export function broadcastUser(userId, areas) {
  if (userId != null) broadcastAreas(areas, personalRoom(userId));
}
export function broadcastAdmins(areas) { broadcastAreas(areas,'admin'); }
// Called after commit/response. Recipient IDs come ONLY from the database, never from client room requests.
export async function broadcastOrderChange(orderId, areas=['orders','notifications']) {
  if (!/^[1-9]\d*$/.test(String(orderId||''))) return;
  const result=await pool.query(`SELECT o.customer_id, a.executive_id FROM cod_orders o
    LEFT JOIN delivery_assignments a ON a.order_id=o.id WHERE o.id=$1`,[orderId]);
  const row=result.rows[0];
  if (row) {
    broadcastUser(row.customer_id, areas.filter(a=>['orders','notifications','cart'].includes(a)));
    broadcastUser(row.executive_id,['delivery','finance','notifications']);
  }
}
export function createRealtimeServer(httpServer, {origin}) {
  if (io) throw new Error('Realtime server already initialized');
  const trusted=String(origin).replace(/\/+$/,'');
  io=new Server(httpServer,{
    path:'/socket.io',
    cors:{origin:trusted,credentials:true,methods:['GET','POST']},
    allowRequest:(request,next)=>next(null,request.headers.origin===trusted),
    maxHttpBufferSize:10000,
    transports:['websocket','polling'],
    connectionStateRecovery:{maxDisconnectionDuration:120000,skipMiddlewares:false}
  });
  io.engine.use(sessionMiddleware);
  io.use(async(socket,next)=>{
    try{
      const session=socket.request.session;
      // Anonymous visitors may receive only public catalogue invalidations.
      if(!session?.userId){socket.data.userId=null;socket.data.role='guest';return next();}
      const {rows}=await pool.query(`SELECT id,role,password_changed_at FROM users WHERE id=$1`,[session.userId]);
      const user=rows[0];
      if(!user||!['admin','customer','delivery'].includes(user.role))return next(new Error('unauthorized'));
      if(user.password_changed_at&&(!session.authTime||Number(session.authTime)<new Date(user.password_changed_at).getTime()))return next(new Error('unauthorized'));
      if(user.role==='delivery'){
        const active=await pool.query('SELECT 1 FROM delivery_staff_profiles WHERE user_id=$1 AND is_active=TRUE',[user.id]);
        if(!active.rows.length)return next(new Error('unauthorized'));
      }
      socket.data.userId=String(user.id);socket.data.role=user.role;
      next();
    }catch(error){console.error('Realtime authorization failed:',error);next(new Error('unavailable'));}
  });
  io.on('connection',socket=>{
    const recheck=setInterval(async()=>{
      if(!socket.data.userId)return; // Guests have no persisted session to reload.
      try{
        const ses=socket.request.session;
        if(!ses)return socket.disconnect(true);
        await new Promise((resolve,reject)=>ses.reload(e=>e?reject(e):resolve()));
        if(String(ses.userId||'')!==String(socket.data.userId||''))return socket.disconnect(true);
        if(socket.data.userId){
          const result=await pool.query('SELECT role,password_changed_at FROM users WHERE id=$1',[socket.data.userId]);
          const user=result.rows[0];
          if(!user||user.role!==socket.data.role || (user.password_changed_at&&(!ses.authTime||Number(ses.authTime)<new Date(user.password_changed_at).getTime())))return socket.disconnect(true);
          if(user.role==='delivery'){const valid=await pool.query('SELECT 1 FROM delivery_staff_profiles WHERE user_id=$1 AND is_active=TRUE',[socket.data.userId]);if(!valid.rows.length)return socket.disconnect(true);}
        }
      }catch{socket.disconnect(true);}
    },60000);recheck.unref?.();
    socket.on('disconnect',()=>clearInterval(recheck));
    socket.join('public');
    if(socket.data.userId)socket.join(personalRoom(socket.data.userId));
    if(socket.data.role==='admin')socket.join('admin');
    // No client-defined rooms, writes, stock, payout or payment changes.
    socket.emit('nexora:ready',{role:socket.data.role});
  });
  return io;
}

export function classifyMutation(method,path){
  const p=String(path||'').split('?')[0];
  if(!['POST','PUT','PATCH','DELETE'].includes(String(method).toUpperCase()))return null;
  if(p==='/api/auth/verify-otp')return {scope:'signup',areas:['customers']};
  // Read-only estimates must NEVER generate inventory/order change storms.
  if(p==='/api/orders/estimate'||p==='/api/cart/quote')return null;
  if(p.startsWith('/api/notifications/'))return {scope:'user',areas:['notifications']};
  if(p.startsWith('/api/cart/'))return {scope:'user',areas:['cart']};
  if(p.startsWith('/api/wishlist/'))return {scope:'user',areas:['wishlist']};
  if(p.startsWith('/api/addresses/'))return {scope:'user',areas:['orders']};
  if(p.startsWith('/api/orders/'))return {scope:'order',areas:['orders','notifications'],stock:true};
  if(p.startsWith('/api/admin/orders/'))return {scope:'order',areas:['orders','finance','delivery','notifications','analytics'],stock:true};
  if(p.startsWith('/api/payments/razorpay/'))return {scope:'order',areas:['orders','finance','notifications','analytics'],stock:true};
  if(p.startsWith('/api/admin/delivery/'))return {scope:'delivery',areas:['delivery','orders','finance','notifications','analytics']};
  if(p.startsWith('/api/delivery/'))return {scope:'delivery',areas:['delivery','orders','finance','notifications','analytics']};
  if(p.startsWith('/api/admin/products')||p.startsWith('/api/admin/categories')||p.startsWith('/api/admin/featured'))return {scope:'admin',areas:['catalog','inventory','analytics','promotions']};
  if(p.startsWith('/api/admin/banners')||p.startsWith('/api/admin/coupons')||p.startsWith('/api/admin/coupon-drafts')||p.startsWith('/api/admin/storefront-copy'))return {scope:'admin',areas:['promotions','catalog']};
  if(p.startsWith('/api/admin/branding')||p.startsWith('/api/admin/footer')||p.startsWith('/api/admin/checkout-settings'))return {scope:'admin',areas:['branding','catalog','promotions']};
  if(p.startsWith('/api/admin/reviews')||p.startsWith('/api/engagement/reviews/')||p.startsWith('/api/engagement/admin/reviews/'))return {scope:'admin',areas:['reviews','catalog']};
  return null;
}
export function mutationRealtimeMiddleware(req,res,next){
  const plan=classifyMutation(req.method,req.originalUrl||req.url);
  if(plan){
    res.once('finish',()=>{
      if(res.statusCode<200||res.statusCode>=300)return;
      try{
        const p=req.originalUrl.split('?')[0];
        if(plan.scope==='signup')broadcastAdmins(['customers']);
        if(plan.scope==='user')broadcastUser(req.user?.id||req.session?.userId,plan.areas);
        if(plan.scope==='order'||plan.scope==='delivery'){
          broadcastAdmins(plan.areas);
          // Only the order owner and actual assigned executive are notified.
          const matched=p.match(/\/(?:orders|assignments|earnings)\/([1-9]\d*)(?:\/|$)/);
          const id=matched?.[1]||req.body?.orderId||null;
          if(id)broadcastOrderChange(id).catch(err=>console.error('Realtime order lookup:',err));
          if(p.endsWith('/assignments/batch'))for(const orderId of (Array.isArray(req.body?.orderIds)?req.body.orderIds:[]).slice(0,25)){
            broadcastOrderChange(orderId).catch(err=>console.error('Realtime batch lookup:',err));
          }
          if(/\/staff\/[1-9]\d+$/.test(p))broadcastUser(p.split('/').at(-1),['delivery','finance','notifications']);
          else if(req.session?.userId)broadcastUser(req.session.userId,plan.areas.filter(a=>['orders','delivery','finance','notifications'].includes(a)));
          if(plan.scope==='delivery'&&req.user?.role==='delivery')broadcastUser(req.user.id,['delivery','finance','notifications']);
          if(plan.stock){broadcastAreas(['catalog','inventory'],'public');broadcastAdmins(['inventory']);}
        }
        if(plan.scope==='admin'){
          broadcastAdmins(plan.areas);
          for(const area of plan.areas.filter(a=>['catalog','promotions','branding','reviews'].includes(a)))broadcastArea(area);
        }
      }catch(e){console.error('Realtime mutation notification:',e);}
    });
  }
  next();
}
