import { Router } from 'express';
import {randomBytes} from 'node:crypto';
import pool from '../config/db.js';
import {requireAdmin,requireCustomer} from '../middleware/authMiddleware.js';
import {normalizeNewsletterEmail,validateReview,reviewEligible} from '../services/storefrontEngagementRules.js';

const router=Router();
const validId=value=>/^[1-9]\d*$/.test(String(value));
const limits=new Map();
function throttle(req,res,next) {
  const key=String(req.ip||'unknown'); const now=Date.now();
  if(limits.size>4000) for(const [id,entry] of limits) if(now-entry.start>3600000)limits.delete(id);
  const entry=limits.get(key)||{start:now,count:0};
  if(now-entry.start>3600000){entry.start=now;entry.count=0;}
  if(++entry.count>12)return res.status(429).json({message:'Too many attempts. Try again later.'});
  limits.set(key,entry);next();
}
router.post('/newsletter',throttle,async(req,res)=>{
  const email=normalizeNewsletterEmail(req.body?.email);
  if(!email || req.body?.consent!==true)return res.status(400).json({message:'Enter a valid email and agree to receive newsletters.'});
  try {
    await pool.query(`INSERT INTO newsletter_subscribers(email,unsubscribe_token) VALUES($1,$2)
      ON CONFLICT(email) DO UPDATE SET is_subscribed=TRUE,consented_at=now(),unsubscribed_at=NULL`,[email,randomBytes(24).toString('hex')]);
    return res.json({message:'You are subscribed. We will email you only when newsletters become available.'});
  }catch(e){console.error('newsletter signup',e);return res.status(503).json({message:'Newsletter signup is temporarily unavailable.'});}
});
router.post('/newsletter/unsubscribe',throttle,async(req,res)=>{
  const token=req.body?.token;
  if(typeof token!=='string'||!/^[a-f0-9]{48}$/.test(token))return res.status(400).json({message:'Invalid unsubscribe link.'});
  try{await pool.query('UPDATE newsletter_subscribers SET is_subscribed=FALSE,unsubscribed_at=NOW() WHERE unsubscribe_token=$1',[token]);return res.json({message:'Unsubscribed.'});}
  catch(e){console.error('newsletter unsubscribe',e);return res.status(503).json({message:'Could not update your subscription.'});}
});
router.get('/reviews/featured',async(_req,res)=>{
  try {const {rows}=await pool.query(`SELECT r.id,r.rating,r.title,r.body,r.created_at,p.id AS product_id,p.name AS product_name,
      split_part(u.full_name,' ',1) AS first_name
      FROM product_reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.customer_id
      WHERE r.status='approved' AND p.is_active=TRUE ORDER BY r.created_at DESC,r.id DESC LIMIT 6`);
    return res.json({reviews:rows.map(r=>({id:String(r.id),productId:String(r.product_id),productName:r.product_name,name:r.first_name,rating:r.rating,title:r.title,body:r.body,createdAt:r.created_at}))});
  }catch(e){console.error('featured reviews',e);return res.status(503).json({message:'Reviews temporarily unavailable.'});}
});
router.get('/reviews/:productId',async(req,res)=>{
  if(!validId(req.params.productId))return res.status(400).json({message:'Invalid product.'});
  try {const {rows}=await pool.query(`SELECT r.id,r.rating,r.title,r.body,r.created_at,split_part(u.full_name,' ',1) AS first_name
    FROM product_reviews r JOIN users u ON u.id=r.customer_id
    WHERE r.product_id=$1 AND r.status='approved' ORDER BY r.created_at DESC,r.id DESC LIMIT 50`,[req.params.productId]);
    const average=rows.length ? Math.round(rows.reduce((s,r)=>s+Number(r.rating),0)/rows.length*10)/10 : null;
    return res.json({count:rows.length,average,reviews:rows.map(r=>({id:String(r.id),name:r.first_name,rating:r.rating,title:r.title,body:r.body,createdAt:r.created_at}))});
  }catch(e){console.error('list reviews',e);return res.status(503).json({message:'Reviews temporarily unavailable.'});}
});
router.post('/reviews/:productId',requireCustomer,throttle,async(req,res)=>{
  if(!validId(req.params.productId))return res.status(400).json({message:'Invalid product.'});
  const error=validateReview(req.body);if(error)return res.status(400).json({message:error});
  try{
    const found=await pool.query(`SELECT o.id,o.status,o.payment_status FROM cod_orders o JOIN cod_order_items i ON i.order_id=o.id
       WHERE o.customer_id=$1 AND i.product_id=$2 AND o.status='delivered' AND o.payment_status IN ('razorpay_paid','cod_collected')
       ORDER BY o.delivered_at DESC NULLS LAST, o.id DESC LIMIT 1`,[req.user.id,req.params.productId]);
    if(!found.rows.length || !reviewEligible(found.rows[0]))return res.status(403).json({message:'Reviews are available after a delivered, paid purchase.'});
    const duplicate=await pool.query('SELECT id FROM product_reviews WHERE product_id=$1 AND customer_id=$2',[req.params.productId,req.user.id]);
    if(duplicate.rows.length)return res.status(409).json({message:'You have already reviewed this product.'});
    await pool.query(`INSERT INTO product_reviews(product_id,customer_id,order_id,rating,title,body)
      VALUES($1,$2,$3,$4,$5,$6)`,[req.params.productId,req.user.id,found.rows[0].id,req.body.rating,req.body.title.trim(),req.body.body.trim()]);
    return res.status(201).json({message:'Review submitted for approval.'});
  }catch(e){if(e.code==='23505')return res.status(409).json({message:'You have already reviewed this product.'});console.error('submit review',e);return res.status(503).json({message:'Could not save review.'});}
});
router.get('/admin/reviews',requireAdmin,async(_req,res)=>{
  try {const {rows}=await pool.query(`SELECT r.id,r.rating,r.title,r.body,r.status,r.created_at,p.name AS product_name,u.full_name AS reviewer_name
    FROM product_reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.customer_id
    ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC LIMIT 200`);
    return res.json({reviews:rows.map(r=>({...r,id:String(r.id)}))});
  }catch(e){console.error('moderation',e);return res.status(503).json({message:'Cannot load reviews.'});}
});
router.patch('/admin/reviews/:id',requireAdmin,async(req,res)=>{
  if(!validId(req.params.id)||!['approved','rejected'].includes(req.body?.status))return res.status(400).json({message:'Invalid review decision.'});
  try {const {rows}=await pool.query(`UPDATE product_reviews SET status=$1,moderated_at=now(),moderated_by=$2 WHERE id=$3 AND status='pending' RETURNING id`,[req.body.status,req.user.id,req.params.id]);
    if(!rows.length)return res.status(409).json({message:'Review already reviewed or missing.'});return res.json({message:'Review updated.'});
  }catch(e){console.error('moderate review',e);return res.status(503).json({message:'Could not update review.'});}
});
export default router;
