import pool from '../config/db.js';
import { validId } from '../services/deliveryRules.js';
export async function listNotifications(req,res){
 try{
  const [rows,counts]=await Promise.all([
   pool.query(`SELECT id,kind,title,message,path,created_at,read_at FROM admin_notifications
     WHERE recipient_user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50`,[req.user.id]),
   pool.query(`SELECT COUNT(*)::int AS unread FROM admin_notifications WHERE recipient_user_id=$1 AND read_at IS NULL`,[req.user.id])
  ]);
  res.json({notifications:rows.rows.map(r=>({...r,id:String(r.id)})),unread:counts.rows[0].unread});
 }catch(e){console.error('Notification list:',e);res.status(500).json({message:'Notifications unavailable.'});}
}
export async function markNotificationRead(req,res){
 if(!validId(req.params.id))return res.status(400).json({message:'Invalid notification.'});
 try{const r=await pool.query(`UPDATE admin_notifications SET read_at=COALESCE(read_at,NOW())
   WHERE recipient_user_id=$1 AND id=$2 RETURNING id`,[req.user.id,req.params.id]);
   return r.rows.length?res.json({ok:true}):res.status(404).json({message:'Notification not found.'});
 }catch(e){console.error('Notification update:',e);res.status(500).json({message:'Notification could not be updated.'});}
}

// Read receipts belong strictly to the signed-in user, for every role.
export async function markAllNotificationsRead(req, res) {
 try {
   await pool.query(`UPDATE admin_notifications SET read_at=COALESCE(read_at,NOW())
     WHERE recipient_user_id=$1 AND read_at IS NULL`,[req.user.id]);
   return res.json({ok:true,unread:0});
 } catch(e) {
   console.error('Notifications mark-all:',e);
   return res.status(500).json({message:'Notifications could not be marked as read.'});
 }
}
