import { Router } from 'express';
import { getRefundConfiguration, requestFullRefund, reconcileFullRefund } from '../controllers/razorpayRefundController.js';
import { rateLimit } from 'express-rate-limit';
import { requireCustomer, requireAdmin } from '../middleware/authMiddleware.js';
import { paymentConfig, initiateRazorpayOrder, verifyRazorpayOrder,
  myRazorpayPaymentStatus, retryRazorpayCheckout, reconcileRazorpayOrder, expirePendingOnlineOrder } from '../controllers/razorpayController.js';
const originGuard=(req,res,next)=>{
  const origin=req.get('origin');
  if(origin&&origin!==(process.env.CLIENT_ORIGIN||'http://localhost:5173'))return res.status(403).json({message:'Request origin not allowed.'});
  next();
};
const router=Router();
const paymentRateLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Too many payment requests. Try again shortly.'}});
router.get('/config',paymentConfig);
router.post('/initiate',requireCustomer,originGuard,paymentRateLimit,initiateRazorpayOrder);
router.post('/verify',requireCustomer,originGuard,paymentRateLimit,verifyRazorpayOrder);
router.get('/orders/:id',requireCustomer,myRazorpayPaymentStatus);
router.get('/orders/:id/checkout',requireCustomer,retryRazorpayCheckout);
router.post('/orders/:id/reconcile',requireCustomer,originGuard,reconcileRazorpayOrder);
router.post('/admin/orders/:id/expire',requireAdmin,originGuard,expirePendingOnlineOrder);
router.get('/admin/refund-config',requireAdmin,getRefundConfiguration);
router.post('/admin/orders/:id/refund',requireAdmin,originGuard,paymentRateLimit,requestFullRefund);
router.post('/admin/orders/:id/refund/reconcile',requireAdmin,originGuard,paymentRateLimit,reconcileFullRefund);
export default router;
