import {Router} from 'express';
import pool from '../config/db.js';
import {requireAdmin,requireDelivery,requireAuthenticated} from '../middleware/authMiddleware.js';
import {listDeliveryStaff,createDeliveryStaff,setDeliveryStaffActive,listDeliveryAssignments,assignDelivery,assignDeliveryBatch,updateMyDelivery,resendDeliveryOtp,confirmDeliveryWithOtp,reportDeliveryIssue,reviewDeliveryIssue} from '../controllers/deliveryController.js';
import {listNotifications,markNotificationRead,markAllNotificationsRead} from '../controllers/notificationsController.js';
function originGuard(req,res,next){const origin=req.get('origin');if(origin&&origin!==(process.env.CLIENT_ORIGIN||'http://localhost:5173'))return res.status(403).json({message:'Request origin not allowed.'});next();}
const admin=Router();admin.use(requireAdmin);
// Version marker and safe, read-only schema diagnostic for local/backend-version mismatches.
admin.get('/health',async (_req,res)=>{
 try{
  const r=await pool.query("SELECT to_regclass('public.delivery_staff_profiles') IS NOT NULL AS staff_ready, to_regclass('public.delivery_assignments') IS NOT NULL AS assignments_ready, to_regclass('public.admin_notifications') IS NOT NULL AS notifications_ready, to_regclass('public.delivery_confirmation_otps') IS NOT NULL AS otp_ready");
  const schema=r.rows[0];
  return res.status(schema.staff_ready&&schema.assignments_ready&&schema.notifications_ready&&schema.otp_ready?200:503).json({service:'nexora-delivery',version:'phase58',ready:Boolean(schema.staff_ready&&schema.assignments_ready&&schema.notifications_ready&&schema.otp_ready),migration:'028_delivery_notifications.sql + 032_delivery_otp_confirmation.sql',message:schema.staff_ready&&schema.assignments_ready&&schema.notifications_ready&&schema.otp_ready?'Delivery API ready.':'Delivery or OTP schema missing. Run npm run migrate from the server folder.'});
 }catch(error){console.error('Delivery health:',error);return res.status(503).json({service:'nexora-delivery',ready:false,message:'Delivery database checks unavailable. Review migration 028 and server logs.'});}
});
admin.get('/staff',listDeliveryStaff);
admin.post('/staff',originGuard,createDeliveryStaff);
admin.patch('/staff/:id',originGuard,setDeliveryStaffActive);
admin.get('/assignments',listDeliveryAssignments);
admin.post('/orders/:orderId/assign',originGuard,assignDelivery);
admin.post('/assignments/batch',originGuard,assignDeliveryBatch);
admin.post('/orders/:orderId/retry-delivery',originGuard,reviewDeliveryIssue);
const delivery=Router();delivery.use(requireDelivery);
delivery.get('/session',(req,res)=>res.json({ready:true,role:'delivery',user:{id:String(req.user.id),fullName:req.user.full_name,email:req.user.email,role:'delivery'}}));
delivery.get('/assignments',listDeliveryAssignments);
delivery.patch('/assignments/:orderId',originGuard,updateMyDelivery);
delivery.post('/assignments/:orderId/otp/resend',originGuard,resendDeliveryOtp);
delivery.post('/assignments/:orderId/confirm-delivery',originGuard,confirmDeliveryWithOtp);
delivery.post('/assignments/:orderId/issues',originGuard,reportDeliveryIssue);
export {admin,delivery};
export const notificationRoutes=Router();
notificationRoutes.get('/',requireAuthenticated,listNotifications);
notificationRoutes.patch('/read-all',originGuard,requireAuthenticated,markAllNotificationsRead);
notificationRoutes.patch('/:id/read',originGuard,requireAuthenticated,markNotificationRead);
