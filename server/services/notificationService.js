// Notifications are written with the corresponding business transaction when possible.
// event_key ensures webhook retries / repeated status actions never spam the inbox.
export async function notifyAdmins(db,{key,kind,title,message,path='/admin/orders'}) {
  await db.query(`INSERT INTO admin_notifications(recipient_user_id,event_key,kind,title,message,path)
    SELECT id,$1,$2,$3,$4,$5 FROM users WHERE role='admin'
    ON CONFLICT(recipient_user_id,event_key) DO NOTHING`,[key,kind,title,message,path]);
}
export async function notifyUser(db,userId,{key,kind,title,message,path}) {
  await db.query(`INSERT INTO admin_notifications(recipient_user_id,event_key,kind,title,message,path)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(recipient_user_id,event_key) DO NOTHING`,
    [userId,key,kind,title,message,path]);
}
