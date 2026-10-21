import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { eligibleForAssignment,canUpdateDelivery,validId,validNewPassword } from '../services/deliveryRules.js';
import { notifyAdmins, notifyUser } from '../services/notificationService.js';

const scrub = r => ({id:String(r.id),fullName:r.full_name,email:r.email,mobile:r.mobile_number,isActive:r.is_active});
const err = (res,e) => {console.error('Delivery operation:',e);return res.status(500).json({message:'Delivery operation could not be completed.'});};
export async function listDeliveryStaff(_req,res){
 try{const r=await pool.query(`SELECT u.id,u.full_name,u.email,u.mobile_number,p.is_active
   FROM delivery_staff_profiles p JOIN users u ON u.id=p.user_id ORDER BY u.full_name`);
  res.json({staff:r.rows.map(scrub)});
 }catch(e){err(res,e);}
}
export async function createDeliveryStaff(req,res){
 const {fullName,email,mobileNumber,password}=req.body??{};
 const name=typeof fullName==='string'?fullName.trim():'';
 const mail=typeof email==='string'?email.trim().toLowerCase():'';
 const phone=typeof mobileNumber==='string'?mobileNumber.trim():'';
 if(name.length<2||name.length>100||mail.length>255||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)||
  !/^\+?[0-9\s-]{10,18}$/.test(phone)||!validNewPassword(password))return res.status(400).json({message:'Enter name, valid email/mobile, and a password with 12–72 UTF-8 bytes.'});
 const db=await pool.connect();let open=false;
 try{
  const hash=await bcrypt.hash(password,12);
  await db.query('BEGIN');open=true;
  const user=await db.query(`INSERT INTO users(full_name,email,mobile_number,password_hash,role)
   VALUES($1,$2,$3,$4,'delivery') RETURNING id,full_name,email,mobile_number`,[name,mail,phone,hash]);
  await db.query('INSERT INTO delivery_staff_profiles(user_id) VALUES($1)',[user.rows[0].id]);
  await db.query('COMMIT');open=false;
  res.status(201).json({staff:{...scrub({...user.rows[0],is_active:true})}});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});
  if(e.code==='23505')return res.status(409).json({message:'An account already uses that email.'});return err(res,e);
 }finally{db.release();}
}
export async function setDeliveryStaffActive(req,res){
 const {id}=req.params;if(!validId(id)||typeof req.body?.isActive!=='boolean')return res.status(400).json({message:'Invalid delivery account.'});
 try{
  if(req.body.isActive===false){
   const open=await pool.query(`SELECT COUNT(*)::int AS n FROM delivery_assignments a JOIN cod_orders o ON o.id=a.order_id
    WHERE a.executive_id=$1 AND a.status<>'delivered' AND o.status NOT IN ('cancelled','delivered')`,[id]);
   if(open.rows[0].n)return res.status(409).json({message:'Reassign active deliveries before disabling this account.'});
  }
  const r=await pool.query('UPDATE delivery_staff_profiles SET is_active=$2 WHERE user_id=$1 RETURNING user_id',[id,req.body.isActive]);
  return r.rows.length?res.json({ok:true}):res.status(404).json({message:'Delivery account not found.'});
 }catch(e){err(res,e);}
}
export async function listDeliveryAssignments(req,res){
 try{
  const worker=req.user.role==='delivery';
  const r=await pool.query(`SELECT a.order_id,a.executive_id,a.status AS delivery_status,a.assigned_at,a.out_for_delivery_at,a.delivered_at,
   o.status AS order_status,o.payment_method,o.payment_status,o.grand_total,o.address_snapshot,o.delivery_partner,o.tracking_reference,
   u.full_name AS executive_name,c.full_name AS customer_name,c.mobile_number AS customer_phone
   FROM delivery_assignments a JOIN cod_orders o ON o.id=a.order_id
   JOIN users u ON u.id=a.executive_id JOIN users c ON c.id=o.customer_id
   ${worker?'WHERE a.executive_id=$1':''}
   ORDER BY a.assigned_at DESC LIMIT 200`,worker?[req.user.id]:[]);
  res.json({assignments:r.rows.map(x=>({orderId:String(x.order_id),executiveId:String(x.executive_id),executiveName:x.executive_name,
    deliveryStatus:x.delivery_status,orderStatus:x.order_status,paymentMethod:x.payment_method,paymentStatus:x.payment_status,
    total:x.grand_total,address:x.address_snapshot,customerName:x.customer_name,customerPhone:x.customer_phone,
    deliveryPartner:x.delivery_partner,trackingReference:x.tracking_reference,assignedAt:x.assigned_at,outForDeliveryAt:x.out_for_delivery_at,deliveredAt:x.delivered_at}))});
 }catch(e){err(res,e);}
}
export async function assignDelivery(req,res){
 const {orderId}=req.params,{executiveId}=req.body??{};
 if(!validId(orderId)||!validId(executiveId))return res.status(400).json({message:'Choose an order and active delivery executive.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const r=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
  if(!r.rows.length){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Order not found.'});}
  if(!eligibleForAssignment(r.rows[0])){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Only confirmed, preparing or dispatched orders with valid payment state can be assigned.'});}
  const pending=await db.query(`SELECT 1 FROM order_cancellation_requests WHERE order_id=$1 AND status='pending'`,[orderId]);
  if(pending.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Resolve customer cancellation request before assigning delivery.'});}
  const staff=await db.query('SELECT user_id FROM delivery_staff_profiles WHERE user_id=$1 AND is_active=TRUE FOR SHARE',[executiveId]);
  if(!staff.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Delivery executive is not active.'});}
  const prior=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  if(prior.rows[0]?.status!=='assigned' && prior.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Cannot reassign a delivery already in progress.'});}
  if(String(prior.rows[0]?.executive_id)===String(executiveId)){await db.query('COMMIT');open=false;return res.json({ok:true,unchanged:true});}
  await db.query(`INSERT INTO delivery_assignments(order_id,executive_id,assigned_by) VALUES($1,$2,$3)
   ON CONFLICT(order_id) DO UPDATE SET executive_id=EXCLUDED.executive_id,assigned_by=EXCLUDED.assigned_by,
   assigned_at=NOW(),updated_at=NOW()`,[orderId,executiveId,req.user.id]);
  await db.query(`INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes)
   VALUES($1,'delivery_assigned',$2,$3)`,[orderId,req.user.id,`Assigned to delivery executive ${executiveId}`]);
  await notifyUser(db,executiveId,{key:`delivery:${orderId}:assigned:${executiveId}`,kind:'delivery',title:'New delivery assigned',message:`Order #${orderId} is ready for your delivery queue.`,path:'/delivery/dashboard'});
  await db.query('COMMIT');open=false;res.json({ok:true});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});err(res,e);}finally{db.release();}
}
export async function updateMyDelivery(req,res){
 const {orderId}=req.params,{status}=req.body??{};
 if(!validId(orderId)||!['out_for_delivery','delivered'].includes(status))return res.status(400).json({message:'Invalid delivery update.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const orderResult=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
  const a=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  const order=orderResult.rows[0],assignment=a.rows[0];
  if(!assignment||String(assignment.executive_id)!==String(req.user.id)){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Assigned delivery not found.'});}
  if(!canUpdateDelivery(order,assignment,status)){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Order must be dispatched; delivery steps must happen in order.'});}
  if(status==='out_for_delivery'){
   await db.query(`UPDATE delivery_assignments SET status='out_for_delivery',out_for_delivery_at=NOW(),updated_at=NOW() WHERE order_id=$1`,[orderId]);
  }else{
   const pending=await db.query(`SELECT 1 FROM order_cancellation_requests WHERE order_id=$1 AND status='pending'`,[orderId]);
   if(pending.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Cancellation request must be reviewed before delivery.'});}
   await db.query(`UPDATE delivery_assignments SET status='delivered',delivered_at=NOW(),updated_at=NOW() WHERE order_id=$1`,[orderId]);
   await db.query(`UPDATE cod_orders SET status='delivered',delivered_at=NOW(),updated_at=NOW() WHERE id=$1`,[orderId]);
  }
  await db.query('INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,$2,$3,$4)',[orderId,status==='delivered'?'delivered':'out_for_delivery',req.user.id,'Updated by assigned delivery executive.']);
  await notifyAdmins(db,{key:`delivery:${orderId}:${status}`,kind:'delivery',title:status==='delivered'?'Order delivered':'Out for delivery',message:`Order #${orderId} status updated by delivery staff.`,path:'/admin/orders'});
  await notifyUser(db,order.customer_id,{key:`order:${orderId}:delivery:${status}`,kind:'delivery',title:status==='delivered'?'Order delivered':'Your order is out for delivery',message:`Delivery update for order #${orderId}.`,path:'/orders'});
  await db.query('COMMIT');open=false;res.json({ok:true});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});err(res,e);}finally{db.release();}
}
