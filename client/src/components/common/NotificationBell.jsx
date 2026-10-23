import UiIcon from "./UiIcon";
import {useCallback,useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {getNotifications,markNotificationRead,markAllNotificationsRead} from '../../services/deliveryService';

export default function NotificationBell(){
 const navigate=useNavigate(),[open,setOpen]=useState(false),[entries,setEntries]=useState([]),[unread,setUnread]=useState(0),[error,setError]=useState('');
 const controller=useRef(null);
 const [markingAll,setMarkingAll]=useState(false);
 const refresh=useCallback(async()=>{
  controller.current?.abort();const c=new AbortController();controller.current=c;
  try{const r=await getNotifications(c.signal);if(!c.signal.aborted){setEntries(r.notifications||[]);setUnread(r.unread||0);setError('');}}
  catch(e){if(e.name!=='AbortError')setError('Could not refresh notifications.');}
 },[]);
 useEffect(()=>{
  refresh();const tick=window.setInterval(()=>{if(document.visibilityState!=='hidden')refresh();},30000);
  const focus=()=>refresh();window.addEventListener('focus',focus);
  const updated=()=>refresh();window.addEventListener('nexora:orders-updated',updated);
  return()=>{clearInterval(tick);controller.current?.abort();window.removeEventListener('focus',focus);window.removeEventListener('nexora:orders-updated',updated);};
 },[refresh]);
 async function visit(item){
  try{if(!item.read_at){await markNotificationRead(item.id);setEntries(old=>old.map(n=>n.id===item.id?{...n,read_at:new Date().toISOString()}:n));setUnread(n=>Math.max(0,n-1));}}
  catch{setError('Could not mark notification as read.');}
  setOpen(false);navigate(item.path?.startsWith('/')&&!item.path.startsWith('//')?item.path:'/');
 }
 async function markAll() {
   if(markingAll || unread===0) return;
   setMarkingAll(true);setError('');
   try{
     await markAllNotificationsRead();
     setEntries(previous=>previous.map(item=>({...item,read_at:item.read_at || new Date().toISOString()})));
     setUnread(0);
     await refresh();
   }catch{setError('Could not mark notifications as read.');}
   finally{setMarkingAll(false);}
 }
 return <div className="nx46-bell-wrap">
  <button type="button" className="nx46-bell" aria-label={`Notifications: ${unread} unread`} aria-expanded={open} onClick={()=>{setOpen(v=>!v);refresh();}}>
   <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
   {unread>0&&<span className="nx46-bell-count">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<div className="nx46-notification-panel" role="region" aria-label="Recent notifications">
   <div className="nx46-notification-title"><strong>Notifications</strong><div className="nx70-bell-header-actions">{unread>0&&<button type="button" className="nx70-mark-all" disabled={markingAll} onClick={markAll}>{markingAll ? 'Saving…' : 'Mark all read'}</button>}<button type="button" onClick={()=>setOpen(false)} aria-label="Close notifications" className="nx64-animated-close nx65-close-control"><UiIcon name="x" size={16}/></button></div></div>
   {error&&<p className="nx46-error" role="alert">{error}</p>}
   {!entries.length?<p className="nx46-notification-empty">No notifications yet. New orders and assignments will appear here.</p>:<div className="nx46-notification-list">{entries.map(n=><button type="button" key={n.id} className={n.read_at?'is-read':'unread'} onClick={()=>visit(n)}><strong>{n.title}</strong><span>{n.message}</span><small>{new Date(n.created_at).toLocaleString('en-IN')}</small></button>)}</div>}
  </div>}
 </div>;
}
