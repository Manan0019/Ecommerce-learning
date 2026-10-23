import bcrypt from 'bcrypt';
import {sendDeliveryConfirmationEmail} from '../config/mailer.js';
import {otpEnabled,issueDeliveryCode,verifyDeliveryCode,maskedEmail,otpRequestAllowed,DELIVERY_OTP_LIFETIME_MS} from '../services/deliveryOtp.js';
import pool from '../config/db.js';
import { eligibleForAssignment,canUpdateDelivery,canReportDeliveryIssue,validateDeliveryIssue,validId,validateBulkDeliveryAssignment } from '../services/deliveryRules.js';
import { notifyAdmins, notifyUser } from '../services/notificationService.js';
import {validateNewDeliveryAccount,validateDeliveryProfile} from '../services/deliveryStaffValidation.js';
import {parseDeliveryRate,rupees} from '../services/deliveryFinanceRules.js';

const scrub = r => ({id:String(r.id),fullName:r.full_name,email:r.email,mobile:r.mobile_number,isActive:r.is_active,payRate:rupees(r.pay_rate_paise)});
const err = (res,e) => {console.error('Delivery operation:',e);return res.status(500).json({message:'Delivery operation could not be completed.'});};
export async function listDeliveryStaff(_req,res){
 try{const r=await pool.query(`SELECT u.id,u.full_name,u.email,u.mobile_number,p.is_active,p.pay_rate_paise,
     COUNT(a.order_id)::int AS total_assignments,
     COUNT(a.order_id) FILTER (WHERE a.status <> 'delivered' AND o.status NOT IN ('cancelled','delivered'))::int AS open_deliveries
   FROM delivery_staff_profiles p JOIN users u ON u.id=p.user_id
   LEFT JOIN delivery_assignments a ON a.executive_id=p.user_id
   LEFT JOIN cod_orders o ON o.id=a.order_id
   GROUP BY u.id,u.full_name,u.email,u.mobile_number,p.is_active,p.pay_rate_paise ORDER BY u.full_name`);
  res.json({staff:r.rows.map(row=>({...scrub(row),openDeliveries:row.open_deliveries,totalAssignments:row.total_assignments}))});
 }catch(e){err(res,e);}
}
export async function createDeliveryStaff(req,res){
 const {fullName,email,mobileNumber,password}=req.body??{};
 const name=typeof fullName==='string'?fullName.trim():'';
 const mail=typeof email==='string'?email.trim().toLowerCase():'';
 const phone=typeof mobileNumber==='string'?mobileNumber.trim():'';
 const errors=validateNewDeliveryAccount(req.body);
 if(parseDeliveryRate(req.body?.payRate)===null)errors.payRate='Enter a valid per-delivery rate from ₹0 to ₹50,000 (up to 2 decimals).';
 if(Object.keys(errors).length)return res.status(400).json({message:'Correct the highlighted delivery account fields.',errors});
 const db=await pool.connect();let open=false;
 try{
  const hash=await bcrypt.hash(password,12);
  await db.query('BEGIN');open=true;
  const user=await db.query(`INSERT INTO users(full_name,email,mobile_number,password_hash,role)
   VALUES($1,$2,$3,$4,'delivery') RETURNING id,full_name,email,mobile_number`,[name,mail,phone,hash]);
  await db.query('INSERT INTO delivery_staff_profiles(user_id,pay_rate_paise) VALUES($1,$2)',[user.rows[0].id,parseDeliveryRate(req.body.payRate)]);
  await db.query('COMMIT');open=false;
  res.status(201).json({staff:{...scrub({...user.rows[0],is_active:true,pay_rate_paise:parseDeliveryRate(req.body.payRate)})}});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});
  if(e.code==='23505')return res.status(409).json({message:'An account already uses that email.',errors:{email:'This email is already registered.'}});return err(res,e);
 }finally{db.release();}
}
/** Admin edits profile and the FUTURE delivery rate; old assignments keep snapshots. */
export async function updateDeliveryStaffDetails(req,res){
 const id=req.params.id;
 if(!validId(id))return res.status(400).json({message:'Invalid delivery account.'});
 const errors=validateDeliveryProfile(req.body);
 const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
 if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.email='Enter a valid email address.';
 const rate=parseDeliveryRate(req.body?.payRate);
 if(rate===null)errors.payRate='Enter an amount between ₹0 and ₹50,000 (up to 2 decimals).';
 if(Object.keys(errors).length)return res.status(400).json({message:'Correct the highlighted fields.',errors});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const found=await db.query(`SELECT user_id FROM delivery_staff_profiles WHERE user_id=$1 FOR UPDATE`,[id]);
  if(!found.rows.length){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Delivery executive not found.'});}
  const updated=await db.query(`UPDATE users SET full_name=$2,email=$3,mobile_number=$4 WHERE id=$1 AND role='delivery' RETURNING id,full_name,email,mobile_number`,[id,req.body.fullName.trim(),email,req.body.mobileNumber]);
  await db.query('UPDATE delivery_staff_profiles SET pay_rate_paise=$2 WHERE user_id=$1',[id,rate]);
  await db.query('COMMIT');open=false;
  return res.json({staff:{...scrub({...updated.rows[0],is_active:true,pay_rate_paise:rate})},note:'New rate applies only to future assignments. Existing assignments retain their agreed amounts.'});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});
  if(e.code==='23505')return res.status(409).json({message:'Email address already registered.',errors:{email:'Another account uses this email.'}});
  return err(res,e);
 }finally{db.release();}
}
/** Permanent deletion is only permitted for unused accounts: all delivery audit history is retained. */
export async function deleteUnusedDeliveryStaff(req,res){
 const id=req.params.id;if(!validId(id))return res.status(400).json({message:'Invalid delivery account.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const staff=await db.query(`SELECT p.user_id FROM delivery_staff_profiles p JOIN users u ON u.id=p.user_id
     WHERE p.user_id=$1 AND u.role='delivery' FOR UPDATE OF p,u`,[id]);
  if(!staff.rows.length){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Delivery account not found.'});}
  const history=await db.query(`SELECT EXISTS(SELECT 1 FROM delivery_assignments WHERE executive_id=$1)
     OR EXISTS(SELECT 1 FROM delivery_issues WHERE executive_id=$1) AS has_history`,[id]);
  if(history.rows[0]?.has_history){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'This executive has delivery history. Disable the account instead to preserve audit records.'});}
  await db.query('DELETE FROM delivery_staff_profiles WHERE user_id=$1',[id]);
  await db.query("DELETE FROM users WHERE id=$1 AND role='delivery'",[id]);
  await db.query('COMMIT');open=false;return res.json({ok:true,message:'Unused delivery account deleted.'});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});
  if(e.code==='23503')return res.status(409).json({message:'This account is referenced by historical records and cannot be deleted. Disable it instead.'});
  return err(res,e);
 }finally{db.release();}
}
/** A signed-in executive may edit their contact profile, never role or delivery ownership. */
export async function updateMyDeliveryProfile(req,res){
 const errors=validateDeliveryProfile(req.body);
 if(Object.keys(errors).length)return res.status(400).json({message:'Correct the highlighted profile fields.',errors});
 try{
  const r=await pool.query(`UPDATE users SET full_name=$1,mobile_number=$2 WHERE id=$3 AND role='delivery'
   RETURNING id,full_name,email,mobile_number`,[req.body.fullName.trim(),req.body.mobileNumber.trim(),req.user.id]);
  if(!r.rows.length)return res.status(404).json({message:'Delivery account unavailable.'});
  return res.json({user:{id:String(r.rows[0].id),fullName:r.rows[0].full_name,email:r.rows[0].email,
   mobileNumber:r.rows[0].mobile_number,role:'delivery'}});
 }catch(e){return err(res,e);}
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
  const r=await pool.query(`SELECT a.order_id,a.executive_id,a.status AS delivery_status,a.assigned_at,a.out_for_delivery_at,a.delivered_at,a.pay_rate_paise,payout.paid_at AS earnings_paid_at,
   o.status AS order_status,o.payment_method,o.payment_status,o.grand_total,o.address_snapshot,o.delivery_partner,o.tracking_reference,
   u.full_name AS executive_name,c.full_name AS customer_name,c.mobile_number AS customer_phone,c.email AS customer_email,
   issue.id AS issue_id,issue.kind AS issue_kind,issue.reason AS issue_reason,
   issue.requested_date AS issue_date,issue.recorded_at AS issue_recorded_at
   FROM delivery_assignments a JOIN cod_orders o ON o.id=a.order_id
   JOIN users u ON u.id=a.executive_id JOIN users c ON c.id=o.customer_id
   LEFT JOIN delivery_earnings_payouts payout ON payout.order_id=a.order_id
   LEFT JOIN LATERAL (SELECT i.* FROM delivery_issues i WHERE i.order_id=a.order_id AND i.state='pending' ORDER BY i.id DESC LIMIT 1) issue ON TRUE
   ${worker?'WHERE a.executive_id=$1':''}
   ORDER BY a.assigned_at DESC LIMIT ${worker?500:200}`,worker?[req.user.id]:[]);
  res.json({assignments:r.rows.map(x=>({orderId:String(x.order_id),executiveId:String(x.executive_id),executiveName:x.executive_name,
    deliveryStatus:x.delivery_status,orderStatus:x.order_status,paymentMethod:x.payment_method,paymentStatus:x.payment_status,
    total:x.grand_total,address:x.address_snapshot,customerName:x.customer_name,customerPhone:x.customer_phone,customerEmailMasked:maskedEmail(x.customer_email),
    deliveryPartner:x.delivery_partner,trackingReference:x.tracking_reference,
    pendingIssue:x.issue_id?{id:String(x.issue_id),kind:x.issue_kind,reason:x.issue_reason,requestedDate:x.issue_date,reportedAt:x.issue_recorded_at}:null,
    assignedAt:x.assigned_at,outForDeliveryAt:x.out_for_delivery_at,deliveredAt:x.delivered_at,payRate:rupees(x.pay_rate_paise),payRatePaise:Number(x.pay_rate_paise),earningsPaidAt:x.earnings_paid_at}))});
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
  const staff=await db.query('SELECT user_id,pay_rate_paise FROM delivery_staff_profiles WHERE user_id=$1 AND is_active=TRUE FOR SHARE',[executiveId]);
  if(!staff.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Delivery executive is not active.'});}
  const prior=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  if(prior.rows[0]?.status!=='assigned' && prior.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Cannot reassign a delivery already in progress.'});}
  if(String(prior.rows[0]?.executive_id)===String(executiveId)){await db.query('COMMIT');open=false;return res.json({ok:true,unchanged:true});}
  await db.query(`INSERT INTO delivery_assignments(order_id,executive_id,assigned_by,pay_rate_paise) VALUES($1,$2,$3,$4)
   ON CONFLICT(order_id) DO UPDATE SET executive_id=EXCLUDED.executive_id,assigned_by=EXCLUDED.assigned_by,
   pay_rate_paise=EXCLUDED.pay_rate_paise,assigned_at=NOW(),updated_at=NOW()`,[orderId,executiveId,req.user.id,staff.rows[0].pay_rate_paise]);
  await db.query(`INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes)
   VALUES($1,'delivery_assigned',$2,$3)`,[orderId,req.user.id,`Assigned to delivery executive ${executiveId}`]);
  await notifyUser(db,executiveId,{key:`delivery:${orderId}:assigned:${executiveId}`,kind:'delivery',title:'New delivery assigned',message:`Order #${orderId} is ready for your delivery queue.`,path:'/delivery/dashboard'});
  await db.query('COMMIT');open=false;res.json({ok:true});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});err(res,e);}finally{db.release();}
}
/** Safely assign 2–25 different orders to one active executive in ONE transaction.
 * Any ineligible/already-assigned order rolls back the entire batch. This does
 * not change the one-executive-per-order ownership rule. */
export async function assignDeliveryBatch(req,res){
 const problem=validateBulkDeliveryAssignment(req.body);
 if(problem)return res.status(400).json({message:problem});
 const executiveId=String(req.body.executiveId);
 const ids=[...req.body.orderIds].map(String).sort((a,b)=>BigInt(a)<BigInt(b)?-1:BigInt(a)>BigInt(b)?1:0);
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const staff=await db.query('SELECT user_id,pay_rate_paise FROM delivery_staff_profiles WHERE user_id=$1 AND is_active=TRUE FOR SHARE',[executiveId]);
  if(!staff.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'The selected delivery executive is disabled or missing.'});}
  for(const id of ids){
   const r=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[id]);
   if(!r.rows.length||!eligibleForAssignment(r.rows[0])){
    await db.query('ROLLBACK');open=false;return res.status(409).json({message:`Order #${id} is no longer eligible for delivery assignment. No orders were assigned.`});
   }
   const pending=await db.query("SELECT 1 FROM order_cancellation_requests WHERE order_id=$1 AND status='pending'",[id]);
   if(pending.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:`Order #${id} has a pending cancellation. No orders were assigned.`});}
   const prior=await db.query('SELECT order_id FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[id]);
   if(prior.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:`Order #${id} is already assigned. Use its individual reassignment control. No orders were assigned.`});}
   await db.query('INSERT INTO delivery_assignments(order_id,executive_id,assigned_by,pay_rate_paise) VALUES($1,$2,$3,$4)',[id,executiveId,req.user.id,staff.rows[0].pay_rate_paise]);
   await db.query("INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,'delivery_assigned',$2,$3)",[id,req.user.id,`Assigned to delivery executive ${executiveId} from the batch assignment workspace`]);
   await notifyUser(db,executiveId,{key:`delivery:${id}:assigned:${executiveId}`,kind:'delivery',title:'New delivery assigned',message:`Order #${id} is ready for your delivery queue.`,path:'/delivery/dashboard'});
  }
  await db.query('COMMIT');open=false;res.json({ok:true,assignedCount:ids.length,orderIds:ids});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});return err(res,e);}finally{db.release();}
}

export async function updateMyDelivery(req,res){
 const {orderId}=req.params,{status}=req.body??{};
 if(!validId(orderId)||status!=='out_for_delivery')return res.status(400).json({message:'Use customer OTP verification to complete delivery.'});
 if(!otpEnabled())return res.status(503).json({message:'Delivery OTP is not configured. Set DELIVERY_OTP_SECRET and SMTP credentials in server/.env.'});
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
  const customer=await db.query('SELECT email FROM users WHERE id=$1',[order.customer_id]);
  const email=customer.rows[0]?.email;
  if(!email){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Customer email is missing. Contact the administrator.'});}
  const issued=issueDeliveryCode(process.env.DELIVERY_OTP_SECRET,orderId);
  await db.query(`INSERT INTO delivery_confirmation_otps(order_id,otp_hash,salt,expires_at)
    VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')
    ON CONFLICT(order_id) DO UPDATE SET otp_hash=EXCLUDED.otp_hash,salt=EXCLUDED.salt,
    expires_at=EXCLUDED.expires_at,attempts=0,sent_at=NOW(),send_window_at=NOW(),send_count=1,verified_at=NULL`,
    [orderId,issued.hash,issued.salt]);
  await db.query(`UPDATE delivery_assignments SET status='out_for_delivery',out_for_delivery_at=NOW(),updated_at=NOW() WHERE order_id=$1`,[orderId]);
  await db.query('INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes) VALUES($1,$2,$3,$4)',[orderId,status==='delivered'?'delivered':'out_for_delivery',req.user.id,'Updated by assigned delivery executive.']);
  await notifyAdmins(db,{key:`delivery:${orderId}:${status}`,kind:'delivery',title:status==='delivered'?'Order delivered':'Out for delivery',message:`Order #${orderId} status updated by delivery staff.`,path:'/admin/orders'});
  await notifyUser(db,order.customer_id,{key:`order:${orderId}:delivery:${status}`,kind:'delivery',title:status==='delivered'?'Order delivered':'Your order is out for delivery',message:`Delivery update for order #${orderId}.`,path:'/orders'});
  await db.query('COMMIT');open=false;
  try{await sendDeliveryConfirmationEmail(email,issued.code,orderId);return res.json({ok:true,otpSent:true,customerEmailMasked:maskedEmail(email)});}
  catch(mailError){console.error('Delivery OTP email failed for order:',orderId,mailError?.code||'SMTP error');
    return res.status(202).json({ok:true,otpSent:false,message:'Order marked out for delivery, but email could not be sent. Check SMTP and use Resend delivery code.'});}
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});err(res,e);}finally{db.release();}
}

export async function resendDeliveryOtp(req,res){
 const {orderId}=req.params;
 if(!validId(orderId))return res.status(400).json({message:'Invalid order.'});
 if(!otpEnabled())return res.status(503).json({message:'Delivery code/email service is not configured.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const orderResult=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
  const assignmentResult=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  const order=orderResult.rows[0],a=assignmentResult.rows[0];
  if(!a||String(a.executive_id)!==String(req.user.id)){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Assigned delivery not found.'});}
  const issues=await db.query("SELECT 1 FROM delivery_issues WHERE order_id=$1 AND state='pending'",[orderId]);
  if(!order||order.status!=='shipped'||a.status!=='out_for_delivery'||order.refund_status||issues.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'This order is not eligible for a new delivery code.'});}
  const current=(await db.query('SELECT * FROM delivery_confirmation_otps WHERE order_id=$1 FOR UPDATE',[orderId])).rows[0];
  const allowed=otpRequestAllowed(current);
  if(!allowed.ok){await db.query('ROLLBACK');open=false;return res.status(429).json({message:allowed.reason});}
  const email=(await db.query('SELECT email FROM users WHERE id=$1',[order.customer_id])).rows[0]?.email;
  if(!email){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Customer email unavailable.'});}
  const issued=issueDeliveryCode(process.env.DELIVERY_OTP_SECRET,orderId);
  await db.query(`INSERT INTO delivery_confirmation_otps(order_id,otp_hash,salt,expires_at,send_count,send_window_at)
    VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes',$4,$5)
    ON CONFLICT(order_id) DO UPDATE SET otp_hash=EXCLUDED.otp_hash,salt=EXCLUDED.salt,
      expires_at=EXCLUDED.expires_at,attempts=0,sent_at=NOW(),send_count=EXCLUDED.send_count,
      send_window_at=EXCLUDED.send_window_at,verified_at=NULL`,[orderId,issued.hash,issued.salt,allowed.count,allowed.windowAt]);
  await db.query('COMMIT');open=false;
  try{await sendDeliveryConfirmationEmail(email,issued.code,orderId);return res.json({ok:true,otpSent:true,customerEmailMasked:maskedEmail(email)});}
  catch(mailError){console.error('Delivery OTP resend failed:',orderId,mailError?.code||'SMTP error');return res.status(502).json({message:'Unable to send the verification email. Check email settings and retry after cooldown.'});}
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});return err(res,e);}finally{db.release();}
}

export async function confirmDeliveryWithOtp(req,res){
 const {orderId}=req.params,code=req.body?.otp;
 if(!validId(orderId)||typeof code!=='string'||!/^\d{6}$/.test(code))return res.status(400).json({message:'Enter the six-digit code provided by the customer.'});
 if(!otpEnabled())return res.status(503).json({message:'Delivery OTP configuration missing.'});
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const orderResult=await db.query('SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE',[orderId]);
  const aResult=await db.query('SELECT * FROM delivery_assignments WHERE order_id=$1 FOR UPDATE',[orderId]);
  const order=orderResult.rows[0],assignment=aResult.rows[0];
  if(!assignment||String(assignment.executive_id)!==String(req.user.id)){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Assigned delivery not found.'});}
  if(!canUpdateDelivery(order,assignment,'delivered')){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Delivery must be dispatched and out for delivery first.'});}
  const blockers=await db.query(`SELECT 1 FROM delivery_issues WHERE order_id=$1 AND state='pending'
    UNION ALL SELECT 1 FROM order_cancellation_requests WHERE order_id=$1 AND status='pending'`,[orderId]);
  if(blockers.rows.length){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Resolve pending delivery or cancellation review first.'});}
  const otp=(await db.query('SELECT * FROM delivery_confirmation_otps WHERE order_id=$1 FOR UPDATE',[orderId])).rows[0];
  if(!otp||otp.verified_at||new Date(otp.expires_at).getTime()<=Date.now()||otp.attempts>=5){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'The delivery code has expired or is locked. Resend a new code.'});}
  if(!verifyDeliveryCode(code,otp.salt,orderId,process.env.DELIVERY_OTP_SECRET,otp.otp_hash)){
    await db.query('UPDATE delivery_confirmation_otps SET attempts=attempts+1 WHERE order_id=$1',[orderId]);
    await db.query('COMMIT');open=false;return res.status(400).json({message:'Incorrect delivery code. Ask the customer to confirm the latest email. Five attempts maximum.'});
  }
  await db.query('UPDATE delivery_confirmation_otps SET verified_at=NOW() WHERE order_id=$1',[orderId]);
  await db.query(`UPDATE delivery_assignments SET status='delivered',delivered_at=NOW(),updated_at=NOW() WHERE order_id=$1`,[orderId]);
  await db.query(`UPDATE cod_orders SET status='delivered',delivered_at=NOW(),updated_at=NOW() WHERE id=$1`,[orderId]);
  await db.query(`INSERT INTO cod_order_events(order_id,event_type,actor_user_id,notes)
     VALUES($1,'delivered',$2,'Customer email delivery code verified at handover.')`,[orderId,req.user.id]);
  await notifyAdmins(db,{key:`delivery:${orderId}:delivered`,kind:'delivery',title:'Order delivered',message:`Order #${orderId} confirmed by delivery OTP.`,path:'/admin/orders'});
  await notifyUser(db,order.customer_id,{key:`order:${orderId}:delivery:delivered`,kind:'delivery',title:'Order delivered',message:`Delivery confirmed for order #${orderId}.`,path:'/orders'});
  await db.query('COMMIT');open=false;return res.json({ok:true,delivered:true});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});return err(res,e);}finally{db.release();}
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
