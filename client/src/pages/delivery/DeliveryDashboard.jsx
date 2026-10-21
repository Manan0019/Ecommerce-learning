import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import NotificationBell from '../../components/common/NotificationBell';
import {getCurrentUser,logout} from '../../services/authService';
import {getMyAssignments,updateMyDelivery} from '../../services/deliveryService';
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function DeliveryDashboard(){
 const navigate=useNavigate(),[me,setMe]=useState(null),[assignments,setAssignments]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 async function refresh(){const r=await getMyAssignments();setAssignments(r.assignments||[]);}
 useEffect(()=>{let mounted=true;Promise.all([getCurrentUser(),getMyAssignments()]).then(([auth,data])=>{
  if(!mounted)return;if(auth.user.role!=='delivery'){navigate('/login',{replace:true});return;}setMe(auth.user);setAssignments(data.assignments||[]);
 }).catch(e=>{if(mounted)setError(e.message)});return()=>{mounted=false};},[navigate]);
 async function update(a,status){setBusy(a.orderId);setError('');setNotice('');try{await updateMyDelivery(a.orderId,status);await refresh();setNotice(`Order #${a.orderId} updated.`);window.dispatchEvent(new Event('nexora:orders-updated'));}catch(e){setError(e.message);}finally{setBusy('');}}
 async function signOut(){try{await logout();navigate('/login',{replace:true});}catch(e){setError(e.message);}}
 return <div className="nx46-delivery-shell"><header className="nx46-delivery-header"><div><strong>Nexora <span>Delivery</span></strong><small>Assigned orders workspace</small></div><div className="nx46-delivery-toolbar"><NotificationBell/><span>{me?.fullName||'Delivery staff'}</span><button type="button" onClick={signOut}>Sign out</button></div></header>
 <main className="nx46-delivery-main"><div className="nx46-delivery-intro"><p>DELIVERY DESK</p><h1>Today's assignments</h1><span>Update delivery progress only for orders assigned to you. COD collection is verified separately by the administrator.</span></div>
 {error&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p className="nx46-success" role="status">{notice}</p>}
 <section className="nx46-metrics"><article><span>Assigned orders</span><strong>{assignments.length}</strong></article><article><span>Waiting for dispatch</span><strong>{assignments.filter(a=>a.orderStatus!=='shipped'&&a.deliveryStatus!=='delivered').length}</strong></article><article><span>Out for delivery</span><strong>{assignments.filter(a=>a.deliveryStatus==='out_for_delivery').length}</strong></article><article><span>Completed</span><strong>{assignments.filter(a=>a.deliveryStatus==='delivered').length}</strong></article></section>
 <div className="nx46-delivery-grid">{assignments.map(a=><article key={a.orderId} className="nx46-delivery-card"><div className="nx46-delivery-card-head"><strong>Order #{a.orderId}</strong><span className="nx46-pill">{a.deliveryStatus.replaceAll('_',' ')}</span></div><h3>{a.customerName}</h3><p className="nx46-address">{[a.address?.addressLine1,a.address?.addressLine2,a.address?.city,a.address?.state,a.address?.pincode].filter(Boolean).join(', ')}</p><p><a href={`tel:${a.customerPhone||a.address?.phone||''}`}>{a.customerPhone||a.address?.phone||'Phone unavailable'}</a></p><div className="nx46-delivery-meta"><span>Order total <strong>{money(a.total)}</strong></span><span>Payment <strong>{a.paymentMethod==='cod'?'COD':'Paid online'}</strong></span><span>Order status <strong>{a.orderStatus}</strong></span></div><div className="nx46-delivery-actions"><button type="button" disabled={!!busy||a.orderStatus!=='shipped'||a.deliveryStatus!=='assigned'} onClick={()=>update(a,'out_for_delivery')}>Out for delivery</button><button type="button" disabled={!!busy||a.orderStatus!=='shipped'||a.deliveryStatus!=='out_for_delivery'} onClick={()=>update(a,'delivered')}>Mark delivered</button></div></article>)}</div>
 {!assignments.length&&<div className="nx46-delivery-empty">No deliveries assigned yet. Ask your administrator to assign an order.</div>}
 </main></div>;
}
