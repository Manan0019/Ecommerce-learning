import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { eligibleForAssignment,canUpdateDelivery,canReportDeliveryIssue,validateDeliveryIssue,validId,validNewPassword } from '../services/deliveryRules.js';
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
   u.full_name AS executive_name,c.full_name AS customer_name,c.mobile_number AS customer_phone,
   issue.id AS issue_id,issue.kind AS issue_kind,issue.reason AS issue_reason,
   issue.requested_date AS issue_date,issue.recorded_at AS issue_recorded_at
   FROM delivery_assignments a JOIN cod_orders o ON o.id=a.order_id
   JOIN users u ON u.id=a.executive_id JOIN users c ON c.id=o.customer_id
   LEFT JOIN LATERAL (SELECT i.* FROM delivery_issues i WHERE i.order_id=a.order_id AND i.state='pending' ORDER BY i.id DESC LIMIT 1) issue ON TRUE
   ${worker?'WHERE a.executive_id=$1':''}
   ORDER BY a.assigned_at DESC LIMIT 200`,worker?[req.user.id]:[]);
  res.json({assignments:r.rows.map(x=>({orderId:String(x.order_id),executiveId:String(x.executive_id),executiveName:x.executive_name,
    deliveryStatus:x.delivery_status,orderStatus:x.order_status,paymentMethod:x.payment_method,paymentStatus:x.payment_status,
    total:x.grand_total,address:x.address_snapshot,customerName:x.customer_name,customerPhone:x.customer_phone,
    deliveryPartner:x.delivery_partner,trackingReference:x.tracking_reference,
    pendingIssue:x.issue_id?{id:String(x.issue_id),kind:x.issue_kind,reason:x.issue_reason,requestedDate:x.issue_date,reportedAt:x.issue_recorded_at}:null,
    assignedAt:x.assigned_at,outForDeliveryAt:x.out_for_delivery_at,deliveredAt:x.delivered_at}))});
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
  const issueCheck=await db.query("SELECT 1 FROM delivery_issues WHERE order_id=$1 AND state='pending'",[orderId]);
  if(issueCheck.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'This delivery has an issue awaiting admin review.'});}
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

export async function reportDeliveryIssue(req,res){
 const {orderId}=req.params,validation=validateDeliveryIssue(req.body);
 if(!validId(orderId)||validation)return res.status(400).json({message:validation||'Invalid order.'});
 const {kind,reason,requestedDate}=req.body;const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  // Serialize delivery updates, reassignment and issue reports per order.
  const o=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
  const a=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  const pending=await db.query("SELECT id FROM delivery_issues WHERE order_id=$1 AND state='pending'",[orderId]);
  if(!a.rows[0]||String(a.rows[0].executive_id)!==String(req.user.id)){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Assigned delivery not found.'});}
  if(!canReportDeliveryIssue(o.rows[0],a.rows[0],pending.rows.length)){
   await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Only an active, dispatched delivery can report an issue; any existing issue must first be reviewed.'});
  }
  const cancellation=await db.query("SELECT 1 FROM order_cancellation_requests WHERE order_id=$1 AND status='pending'",[orderId]);
  if(cancellation.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Cancellation request is under review.'});}
  const report=await db.query(`INSERT INTO delivery_issues(order_id,executive_id,kind,reason,requested_date)
    VALUES($1,$2,$3,$4,$5) RETURNING id`,[orderId,req.user.id,kind,reason.trim(),kind==='reschedule_requested'?requestedDate:null]);
  const issueId=String(report.rows[0].id);
  await db.query(`INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'delivery_issue',$2,$3)`,
    [orderId,req.user.id,`${kind==='failed_attempt'?'Delivery attempt failed':'Reschedule requested'}: ${reason.trim()}`.slice(0,200)]);
  await notifyAdmins(db,{key:`delivery:${orderId}:issue:${issueId}`,kind:'delivery',title:'Delivery needs review',
    message:`Order #${orderId}: ${kind==='failed_attempt'?'failed delivery attempt':'reschedule requested'} by assigned executive.`,path:'/admin/delivery'});
  await notifyUser(db,o.rows[0].customer_id,{key:`order:${orderId}:issue:${issueId}`,kind:'delivery',title:'Delivery update',
    message:`Delivery for order #${orderId} requires a new attempt. Our team is reviewing the next steps.`,path:'/orders'});
  await db.query('COMMIT');open=false;res.status(201).json({ok:true,issueId});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});err(res,e);}finally{db.release();}
}
export async function reviewDeliveryIssue(req,res){
 const {orderId}=req.params;
 if(!validId(orderId)||req.body?.action!=='retry')return res.status(400).json({message:'Choose a valid order and retry action.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const o=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
  const a=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  const pending=await db.query("SELECT * FROM delivery_issues WHERE order_id=$1 AND state='pending' FOR UPDATE",[orderId]);
  if(!o.rows.length||!a.rows.length||!pending.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'No pending delivery issue to review.'});}
  if(o.rows[0].status!=='shipped'||o.rows[0].refund_status||a.rows[0].status!=='out_for_delivery'){
   await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Order is no longer eligible for delivery retry.'});}
  const cancellation=await db.query("SELECT 1 FROM order_cancellation_requests WHERE order_id=$1 AND status='pending'",[orderId]);
  if(cancellation.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Resolve the cancellation request first.'});}
  await db.query("UPDATE delivery_issues SET state='resolved',resolved_at=NOW(),resolved_by=$2 WHERE id=$1",[pending.rows[0].id,req.user.id]);
  await db.query("UPDATE delivery_assignments SET status='assigned',out_for_delivery_at=NULL,updated_at=NOW() WHERE order_id=$1",[orderId]);
  await db.query("INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'delivery_retry',$2,'Admin authorized another delivery attempt.')",[orderId,req.user.id]);
  await notifyUser(db,a.rows[0].executive_id,{key:`delivery:${orderId}:retry:${pending.rows[0].id}`,kind:'delivery',title:'Delivery retry approved',
    message:`Order #${orderId} is ready for another delivery attempt.`,path:'/delivery/dashboard'});
  await notifyUser(db,o.rows[0].customer_id,{key:`order:${orderId}:retry:${pending.rows[0].id}`,kind:'delivery',title:'Delivery retry planned',
    message:`Our team has approved another delivery attempt for order #${orderId}.`,path:'/orders'});
  await db.query('COMMIT');open=false;res.json({ok:true});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});err(res,e);}finally{db.release();}
}
