import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import DeliveryExecutivePicker from '../../components/admin/DeliveryExecutivePicker';
import UiIcon from "../../components/common/UiIcon";
import {Link} from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Modal from '../../components/common/Modal';
import {getDeliveryHealth,getDeliveryStaff,createDeliveryStaff,setDeliveryStaffActive,getAdminAssignments,assignDelivery} from '../../services/deliveryService';
import {getAdminOrders} from '../../services/orderService';

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const isEligible=o=>['confirmed','processing','shipped'].includes(o.status)&&
 (o.paymentMethod!=='Razorpay'||o.paymentStatus==='razorpay_paid')&&o.cancellationRequest?.status!=='pending';
export default function AdminDelivery(){
 const [staff,setStaff]=useState([]),[assignments,setAssignments]=useState([]),[orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[pickerOrderId,setPickerOrderId]=useState(null),[pickerError,setPickerError]=useState(''),[serviceReady,setServiceReady]=useState(false),[serviceError,setServiceError]=useState('');
 const [searchParams,setSearchParams]=useSearchParams();
 const requestedOrderId=searchParams.get('orderId');
 async function refresh(){const [s,a,o]=await Promise.all([getDeliveryStaff(),getAdminAssignments(),getAdminOrders()]);setStaff(s.staff||[]);setAssignments(a.assignments||[]);setOrders(o.orders||[]);}
 useEffect(()=>{let active=true;const controller=new AbortController();
  getDeliveryHealth(controller.signal).then(health=>{
   if(!active)return;
   if(!health.ready)throw new Error('Delivery database setup is incomplete. Run npm run migrate in the server folder, then restart Express.');
   setServiceReady(true);
   return Promise.all([getDeliveryStaff(controller.signal),getAdminAssignments(controller.signal),getAdminOrders(controller.signal)]);
  }).then(data=>{if(active&&data){const [s,a,o]=data;setStaff(s.staff||[]);setAssignments(a.assignments||[]);setOrders(o.orders||[]);}})
   .catch(e=>{if(!active||e.name==='AbortError')return;
    const message=e.status===404?'The running backend does not have the delivery API. Merge Phase 51 server files, apply migration 028, and restart the server on port 4000.':e.message;
    setServiceError(message);setServiceReady(false);
   }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;controller.abort();};},[]);
 const assignmentMap=useMemo(()=>new Map(assignments.map(a=>[a.orderId,a])),[assignments]);
 const candidates=orders.filter(o=>isEligible(o));
 const pickerOrder=candidates.find(o=>String(o.id)===String(pickerOrderId));
 useEffect(()=>{if(loading||!serviceReady||!requestedOrderId)return;
  if(candidates.some(o=>String(o.id)===requestedOrderId)){setPickerOrderId(requestedOrderId);setPickerError('');}
  else setNotice(`Order #${requestedOrderId} is not eligible for delivery assignment.`);
  setSearchParams({}, {replace:true});
 },[loading,serviceReady,requestedOrderId,orders,setSearchParams]);
 function openPicker(order){setError('');setPickerError('');setPickerOrderId(order.id);}
 function closePicker(){if(!busy){setPickerOrderId(null);setPickerError('');}}
 async function create(e){e.preventDefault();if(!serviceReady){setError('Delivery service is unavailable. Complete the backend setup first.');return;}setBusy(true);setError('');try{await createDeliveryStaff(form);await refresh();setForm(null);setNotice('Delivery staff account created. Share the credentials privately.');}catch(ex){setError(ex.message);}finally{setBusy(false);}}
 async function toggle(u){setBusy(true);setError('');try{await setDeliveryStaffActive(u.id,!u.isActive);await refresh();}catch(ex){setError(ex.message);}finally{setBusy(false);}}
 async function assignSelected(id){if(!pickerOrder)return;
  setBusy(true);setPickerError('');setNotice('');
  try{await assignDelivery(pickerOrder.id,id);await refresh();setPickerOrderId(null);
   setNotice(`Order #${pickerOrder.id} assigned. The selected delivery executive has been notified.`);}
  catch(ex){setPickerError(ex.message);}
  finally{setBusy(false);}
 }
 return <AdminLayout title="Delivery operations" subtitle="Manage your delivery team, assign ready orders, and follow their progress." actions={<button className="admin-primary-action" disabled={loading||!serviceReady} onClick={()=>{setForm({fullName:'',email:'',mobileNumber:'',password:''});setError('');}}>+ Add delivery person</button>}>
  {serviceError&&<div className="admin-alert nx51-service-warning" role="alert"><strong>Delivery setup needs attention</strong><p>{serviceError}</p><p>Check <code>/api/admin/delivery/health</code> while signed in as admin. Do not create a delivery account until the API is ready.</p></div>}
  {error&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p className="nx46-success" role="status">{notice}</p>}
  <section className="nx46-metrics"><article><span>Delivery staff</span><strong>{staff.length}</strong><small>{staff.filter(s=>s.isActive).length} active</small></article><article><span>Eligible orders</span><strong>{candidates.length}</strong><small>Confirmed / preparing / dispatched</small></article><article><span>Out for delivery</span><strong>{assignments.filter(a=>a.deliveryStatus==='out_for_delivery').length}</strong><small>Currently with executives</small></article><article><span>Delivered</span><strong>{assignments.filter(a=>a.deliveryStatus==='delivered').length}</strong><small>Completed assignments</small></article></section>
  <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Delivery team</h2><p>Only administrators can create or disable delivery accounts.</p></div><Link to="/delivery/login" target="_blank" rel="noopener noreferrer">Open delivery sign-in <UiIcon name="up-right" size={16}/></Link></div>
    {loading?<p>Loading…</p>:!staff.length?<p>No delivery staff yet. Create the first account above.</p>:<div className="nx46-table-wrap"><table className="nx46-table"><thead><tr><th>Executive</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead><tbody>{staff.map(s=><tr key={s.id}><td><strong>{s.fullName}</strong></td><td>{s.email}<br/><small>{s.mobile}</small></td><td><span className={`nx46-pill ${s.isActive?'good':'muted'}`}>{s.isActive?'Active':'Disabled'}</span></td><td><button type="button" disabled={busy} onClick={()=>toggle(s)}>{s.isActive?'Disable':'Enable'}</button></td></tr>)}</tbody></table></div>}
  </section>
  <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Assign delivery orders</h2><p>Dispatch an order using Orders before the executive can mark it out for delivery.</p></div><Link to="/admin/orders">Manage orders <UiIcon name="right" size={17}/></Link></div>
   {!candidates.length?<p>No eligible orders right now.</p>:<div className="nx46-table-wrap"><table className="nx46-table"><thead><tr><th>Order</th><th>Customer</th><th>Fulfillment</th><th>Assign executive</th></tr></thead><tbody>{candidates.map(o=>{const current=assignmentMap.get(o.id);return <tr key={o.id}><td><strong>#{o.id}</strong><br/><small>{money(o.total)}</small></td><td>{o.customerName}<br/><small>{o.address?.city||'—'}</small></td><td><span className="nx46-pill">{o.status}</span>{current&&<small className="nx46-block">{current.deliveryStatus} · {current.executiveName}</small>}</td><td><div className="nx53-order-action">{current&&<span className="nx53-order-assignee" title={current.executiveName}>{current.executiveName}</span>}<button type="button" className="nx53-open-picker" disabled={busy||!!current&&current.deliveryStatus!=='assigned'} onClick={()=>openPicker(o)}><UiIcon name="users" size={16}/>{current?'Change executive':'Choose executive'}</button></div></td></tr>})}</tbody></table></div>}
  </section>
  <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Assignment activity</h2><p>Track assigned, out-for-delivery and completed orders.</p></div></div>
   {!assignments.length?<p>No assignment history yet.</p>:<div className="nx46-table-wrap"><table className="nx46-table"><thead><tr><th>Order</th><th>Executive</th><th>Delivery status</th><th>Order status</th><th>Assigned on</th></tr></thead><tbody>{assignments.slice(0,50).map(a=><tr key={a.orderId}><td>#{a.orderId}</td><td>{a.executiveName}</td><td><span className={`nx46-pill ${a.deliveryStatus==='delivered'?'good':''}`}>{a.deliveryStatus.replaceAll('_',' ')}</span></td><td>{a.orderStatus}</td><td>{new Date(a.assignedAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>}
  </section>
  {pickerOrder&&<DeliveryExecutivePicker key={pickerOrder.id} order={pickerOrder} current={assignmentMap.get(pickerOrder.id)} staff={staff} assignments={assignments} busy={busy} error={pickerError} onAssign={assignSelected} onClose={closePicker}/>}
  {form&&<Modal title="Create delivery account" subtitle="Only this person will be able to access assigned deliveries." size="small" onClose={()=>{if(!busy)setForm(null);}}><form className="nx46-create-form" onSubmit={create}>{error&&<p className="admin-alert" role="alert">{error}</p>}{[['fullName','Full name','text'],['email','Email','email'],['mobileNumber','Mobile number','tel'],['password','Temporary password (12+ characters)','password']].map(([field,label,type])=><label key={field}>{label}<input type={type} required minLength={field==='password'?12:undefined} value={form[field]} autoComplete="off" onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}/></label>)}<p>Share credentials privately. Do not use a customer's existing email.</p><div className="nx46-modal-actions"><button type="button" disabled={busy} onClick={()=>setForm(null)}>Cancel</button><button type="submit" disabled={busy}>{busy?'Creating…':'Create account'}</button></div></form></Modal>}
 </AdminLayout>;
}
