import {Router} from 'express';
import pool from '../config/db.js';
import {requireAdmin,requireDelivery,requireAuthenticated} from '../middleware/authMiddleware.js';
import {listDeliveryStaff,createDeliveryStaff,updateDeliveryStaffDetails,setDeliveryStaffActive,deleteUnusedDeliveryStaff,updateMyDeliveryProfile,listDeliveryAssignments,assignDelivery,assignDeliveryBatch,updateMyDelivery,resendDeliveryOtp,confirmDeliveryWithOtp,reportDeliveryIssue,reviewDeliveryIssue} from '../controllers/deliveryController.js';
import {getMyEarnings,getAdminEarnings,recordEarningsPayout,getAdminCollections} from '../controllers/deliveryFinanceController.js';
import {listNotifications,markNotificationRead,markAllNotificationsRead} from '../controllers/notificationsController.js';
function originGuard(req,res,next){const origin=req.get('origin');if(origin&&origin!==(process.env.CLIENT_ORIGIN||'http://localhost:5173'))return res.status(403).json({message:'Request origin not allowed.'});next();}
const admin=Router();admin.use(requireAdmin);
// Version marker and safe, read-only schema diagnostic for local/backend-version mismatches.
admin.get('/health',async (_req,res)=>{
 try{
  const r=await pool.query("SELECT to_regclass('public.delivery_staff_profiles') IS NOT NULL AS staff_ready, to_regclass('public.delivery_assignments') IS NOT NULL AS assignments_ready, to_regclass('public.admin_notifications') IS NOT NULL AS notifications_ready, to_regclass('public.delivery_confirmation_otps') IS NOT NULL AS otp_ready, to_regclass('public.delivery_earnings_payouts') IS NOT NULL AS payouts_ready, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='delivery_assignments' AND column_name='pay_rate_paise') AS rate_ready");
  const schema=r.rows[0];
  return res.status(schema.staff_ready&&schema.assignments_ready&&schema.notifications_ready&&schema.otp_ready&&schema.payouts_ready&&schema.rate_ready?200:503).json({service:'nexora-delivery',version:'phase81',ready:Boolean(schema.staff_ready&&schema.assignments_ready&&schema.notifications_ready&&schema.otp_ready&&schema.payouts_ready&&schema.rate_ready),message:schema.staff_ready&&schema.assignments_ready&&schema.notifications_ready&&schema.otp_ready&&schema.payouts_ready&&schema.rate_ready?'Delivery API ready.':'Delivery service is temporarily unavailable.'});
 }catch(error){console.error('Delivery health:',error);return res.status(503).json({service:'nexora-delivery',ready:false,message:'Delivery service is temporarily unavailable.'});}
});
admin.get('/staff',listDeliveryStaff);
admin.post('/staff',originGuard,createDeliveryStaff);
admin.patch('/staff/:id',originGuard,setDeliveryStaffActive);
admin.put('/staff/:id',originGuard,updateDeliveryStaffDetails);
admin.get('/earnings',getAdminEarnings);
admin.post('/earnings/:orderId/pay',originGuard,recordEarningsPayout);
admin.get('/collections',getAdminCollections);
admin.delete('/staff/:id',originGuard,deleteUnusedDeliveryStaff);
admin.get('/assignments',listDeliveryAssignments);
admin.post('/orders/:orderId/assign',originGuard,assignDelivery);
admin.post('/assignments/batch',originGuard,assignDeliveryBatch);
admin.post('/orders/:orderId/retry-delivery',originGuard,reviewDeliveryIssue);
const delivery=Router();delivery.use(requireDelivery);
delivery.get('/session',async (req,res)=>{
 try{const result=await pool.query('SELECT pay_rate_paise FROM delivery_staff_profiles WHERE user_id=$1',[req.user.id]);
  const paise=Number(result.rows[0]?.pay_rate_paise||0);
  return res.json({ready:true,role:'delivery',user:{id:String(req.user.id),fullName:req.user.full_name,email:req.user.email,mobileNumber:req.user.mobile_number,role:'delivery',payRate:(paise/100).toFixed(2)}});
 }catch(e){console.error('Delivery session rate:',e);return res.status(503).json({message:'Delivery account information is temporarily unavailable.'});}
});
delivery.patch('/profile',originGuard,updateMyDeliveryProfile);
delivery.get('/assignments',listDeliveryAssignments);
delivery.get('/earnings',getMyEarnings);
delivery.patch('/assignments/:orderId',originGuard,updateMyDelivery);
delivery.post('/assignments/:orderId/otp/resend',originGuard,resendDeliveryOtp);
delivery.post('/assignments/:orderId/confirm-delivery',originGuard,confirmDeliveryWithOtp);
delivery.post('/assignments/:orderId/issues',originGuard,reportDeliveryIssue);
export {admin,delivery};
export const notificationRoutes=Router();
notificationRoutes.get('/',requireAuthenticated,listNotifications);
notificationRoutes.patch('/read-all',originGuard,requireAuthenticated,markAllNotificationsRead);
notificationRoutes.patch('/:id/read',originGuard,requireAuthenticated,markNotificationRead);
