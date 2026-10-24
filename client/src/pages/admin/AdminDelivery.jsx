import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import {useEffect,useMemo,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import DeliveryExecutivePicker from '../../components/admin/DeliveryExecutivePicker';
import DeliveryTeamTable from '../../components/admin/DeliveryTeamTable';
import DeliveryBatchAssignmentDialog from '../../components/admin/DeliveryBatchAssignmentDialog';
import {deliveryTeamWithWorkload} from '../../services/deliveryAssignmentView';
import UiIcon from "../../components/common/UiIcon";
import {Link} from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Modal from '../../components/common/Modal';
import {validateDeliveryForm,deliveryFieldError} from '../../services/deliveryAccountValidation';
import {getDeliveryHealth,getDeliveryStaff,createDeliveryStaff,editDeliveryStaff,setDeliveryStaffActive,deleteUnusedDeliveryStaff,getAdminAssignments,assignDelivery,assignDeliveryBatch,retryDeliveryIssue} from '../../services/deliveryService';
import {getAdminOrders} from '../../services/orderService';

const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const isEligible=o=>['confirmed','processing','shipped'].includes(o.status)&&
 (o.paymentMethod==='Cash on Delivery'||(o.paymentMethod==='Razorpay'&&o.paymentStatus==='razorpay_paid'))&&!o.refundStatus&&o.cancellationRequest?.status!=='pending';
export default function AdminDelivery(){
 const [staff,setStaff]=useState([]),[assignments,setAssignments]=useState([]),[orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const liveRevision=useRealtimeRevision(['delivery', 'orders', 'finance']);
 const [orderQuery,setOrderQuery]=useState(''),[orderStatus,setOrderStatus]=useState('all'),[ordersPage,setOrdersPage]=useState(1);
 const [activityQuery,setActivityQuery]=useState(''),[activityStatus,setActivityStatus]=useState('all'),[activityPage,setActivityPage]=useState(1);
 const [retryOrder,setRetryOrder]=useState(null);
 const [selectedOrderIds,setSelectedOrderIds]=useState([]);
 const [bulkOpen,setBulkOpen]=useState(false),[bulkError,setBulkError]=useState('');
 const [formErrors,setFormErrors]=useState({}),[pendingDelete,setPendingDelete]=useState(null),[editingExecutive,setEditingExecutive]=useState(null);
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
  return()=>{active=false;controller.abort();};},[liveRevision]);
 const assignmentMap=useMemo(()=>new Map(assignments.map(a=>[String(a.orderId),a])),[assignments]);
 const candidates=orders.filter(o=>isEligible(o));
 const workload=useMemo(()=>deliveryTeamWithWorkload(staff,assignments),[staff,assignments]);
 const unassigned=candidates.filter(o=>!assignmentMap.has(String(o.id)));
 const selectedOrders=unassigned.filter(o=>selectedOrderIds.includes(String(o.id)));
 const allSelected=unassigned.length>0&&unassigned.slice(0,25).every(o=>selectedOrderIds.includes(String(o.id)));
 const matchingOrders=candidates.filter(o=>`${o.id} ${o.customerName||''} ${o.address?.city||''}`.toLowerCase().includes(orderQuery.trim().toLowerCase())&&(orderStatus==='all'||(orderStatus==='unassigned'&&!assignmentMap.has(String(o.id)))||(orderStatus==='assigned'&&assignmentMap.has(String(o.id)))));
 const ordersLimit=10, ordersPages=Math.max(1,Math.ceil(matchingOrders.length/ordersLimit)),ordersSlice=matchingOrders.slice((Math.min(ordersPage,ordersPages)-1)*ordersLimit,Math.min(ordersPage,ordersPages)*ordersLimit);
 const matchingActivity=assignments.filter(a=>`${a.orderId} ${a.executiveName||''} ${a.customerName||''}`.toLowerCase().includes(activityQuery.trim().toLowerCase())&&(activityStatus==='all'||a.deliveryStatus===activityStatus));
 const activityLimit=12, activityPages=Math.max(1,Math.ceil(matchingActivity.length/activityLimit)),activitySlice=matchingActivity.slice((Math.min(activityPage,activityPages)-1)*activityLimit,Math.min(activityPage,activityPages)*activityLimit);
 const pickerOrder=candidates.find(o=>String(o.id)===String(pickerOrderId));
 useEffect(()=>{if(loading||!serviceReady||!requestedOrderId)return;
  if(candidates.some(o=>String(o.id)===requestedOrderId)){setPickerOrderId(requestedOrderId);setPickerError('');}
  else setNotice(`Order #${requestedOrderId} is not eligible for delivery assignment.`);
  setSearchParams({}, {replace:true});
 },[loading,serviceReady,requestedOrderId,orders,setSearchParams]);
 function toggleOrder(id){const str=String(id);setSelectedOrderIds(previous=>previous.includes(str)?previous.filter(x=>x!==str):previous.length>=25?previous:[...previous,str]);}
 function toggleAllOrders(){setSelectedOrderIds(allSelected?[]:unassigned.slice(0,25).map(o=>String(o.id)));}
 async function assignBatchSelected(executiveId){
  if(selectedOrders.length<2)return;
  setBusy(true);setBulkError('');setNotice('');
  try{const result=await assignDeliveryBatch(selectedOrders.map(o=>o.id),executiveId);
   await refresh();setBulkOpen(false);setSelectedOrderIds([]);
   setNotice(`${result.assignedCount} orders assigned to the selected executive. Their delivery queue is ready.`);
  }catch(ex){setBulkError(ex.message);}finally{setBusy(false);}
 }
 function openPicker(order){setError('');setPickerError('');setPickerOrderId(order.id);}
 function closePicker(){if(!busy){setPickerOrderId(null);setPickerError('');}}
 async function create(e){
  e.preventDefault();const errors=validateDeliveryForm(form,{profile:Boolean(editingExecutive)});
  // Editing still validates sign-in email and rate, while password is unchanged.
  if(editingExecutive){for(const field of ['email','payRate']){const msg=deliveryFieldError(field,form?.[field]);if(msg)errors[field]=msg;}}
  setFormErrors(errors);
  if(Object.keys(errors).length)return;
  if(!serviceReady){setError('Delivery service is unavailable. Complete the backend setup first.');return;}
  setBusy(true);setError('');const wasEditing=Boolean(editingExecutive);try{if(editingExecutive){await editDeliveryStaff(editingExecutive.id,form);}else{await createDeliveryStaff(form);}
    window.dispatchEvent(new Event('nexora:changes-saved'));setForm(null);setEditingExecutive(null);setFormErrors({});await refresh();setNotice(wasEditing?'Executive details and future pay rate updated. Existing assignments keep their rates.':'Delivery staff account created. Share the credentials privately.');}
  catch(ex){if(ex.data?.errors)setFormErrors(ex.data.errors);else if(ex.status===409)setFormErrors({email:ex.message});else setError(ex.message);}finally{setBusy(false);}
 }
 async function removeUnusedStaff(){
  if(!pendingDelete)return;setBusy(true);setError('');
  try{await deleteUnusedDeliveryStaff(pendingDelete.id);await refresh();setPendingDelete(null);setNotice('Unused delivery executive account permanently deleted.');}
  catch(ex){setError(ex.message);setPendingDelete(null);}finally{setBusy(false);}
 }
 async function toggle(u){setBusy(true);setError('');try{await setDeliveryStaffActive(u.id,!u.isActive);await refresh();}catch(ex){setError(ex.message);}finally{setBusy(false);}}
 async function authorizeRetry(){
  if(!retryOrder)return;setBusy(true);setError('');
  try{await retryDeliveryIssue(retryOrder.orderId);await refresh();setRetryOrder(null);
   setNotice('Delivery retry approved. The assigned executive and customer have been notified.');}
  catch(ex){setError(ex.message);}finally{setBusy(false);}
 }
 async function assignSelected(id){if(!pickerOrder)return;
  setBusy(true);setPickerError('');setNotice('');
  try{await assignDelivery(pickerOrder.id,id);await refresh();setPickerOrderId(null);
   setNotice(`Order #${pickerOrder.id} assigned. The selected delivery executive has been notified.`);}
  catch(ex){setPickerError(ex.message);}
  finally{setBusy(false);}
 }
 return <AdminLayout title="Delivery operations" subtitle="Manage your delivery team, assign ready orders, and follow their progress." actions={<button className="admin-primary-action" disabled={loading||!serviceReady} onClick={()=>{setEditingExecutive(null);setForm({fullName:'',email:'',mobileNumber:'',password:'',payRate:'0.00'});setFormErrors({});setError('');}}>+ Add delivery person</button>}>
  {serviceError&&<div className="admin-alert nx51-service-warning" role="alert"><strong>Delivery setup needs attention</strong><p>{serviceError}</p><p>Check <code>/api/admin/delivery/health</code> while signed in as admin. Do not create a delivery account until the API is ready.</p></div>}
  {error&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p className="nx46-success" role="status">{notice}</p>}
  <section className="nx46-metrics"><article><span>Delivery staff</span><strong>{staff.length}</strong><small>{staff.filter(s=>s.isActive).length} active</small></article><article><span>Eligible orders</span><strong>{candidates.length}</strong><small>Confirmed / preparing / dispatched</small></article><article><span>Out for delivery</span><strong>{assignments.filter(a=>a.deliveryStatus==='out_for_delivery').length}</strong><small>Currently with executives</small></article><article><span>Delivered</span><strong>{assignments.filter(a=>a.deliveryStatus==='delivered').length}</strong><small>Completed assignments</small></article></section>
  <Link to="/admin/finance" className="nx81-finance-link"><UiIcon name="right" size={17}/> View revenue, COD collection and delivery payouts</Link>
  <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Delivery team</h2><p>Manage executive profiles, future pay rates, workload and account access.</p></div></div>
    <DeliveryTeamTable staff={workload} loading={loading} busy={busy}
      onEdit={member=>{setEditingExecutive(member);setForm({fullName:member.fullName,email:member.email,mobileNumber:member.mobile,password:'',payRate:String(member.payRate||'0.00')});setFormErrors({});setError('');}}
      onToggle={toggle} onDelete={setPendingDelete}/>
  </section>
  <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Assign delivery orders</h2><p>Dispatch an order using Orders before the executive can mark it out for delivery.</p></div><Link className="nx78-panel-link" to="/admin/orders"><span>Manage orders</span><UiIcon name="right" size={17}/></Link></div>
   <div className="nx55-batch-toolbar"><div><strong>Multi-order assignment</strong><small>Select 2–25 unassigned orders and give them to one executive. Each order still has only one assigned executive.</small></div><div><span>{selectedOrders.length} selected</span><button type="button" className="nx53-open-picker" disabled={busy||selectedOrders.length<2} onClick={()=>{setBulkError('');setBulkOpen(true);}}><UiIcon name="users" size={16}/> Assign selected</button></div></div>
   <div className="nx77-table-toolbar"><label className="nx77-search-field"><UiIcon name="search" size={17}/><input type="search" placeholder="Search order, customer or city" aria-label="Search delivery orders" value={orderQuery} onChange={e=>{setOrderQuery(e.target.value);setOrdersPage(1);}}/></label><label className="nx77-filter-label">Assignment<select value={orderStatus} onChange={e=>{setOrderStatus(e.target.value);setOrdersPage(1);}}><option value="all">All eligible orders</option><option value="unassigned">Unassigned</option><option value="assigned">Assigned</option></select></label><strong>{matchingOrders.length} matches</strong></div>
   {!matchingOrders.length?<p>No eligible orders match the selected filters.</p>:<div className="nx46-table-wrap nx73-assignment-wrap"><table className="nx46-table nx73-assignment-table"><thead><tr><th className="nx55-select-th"><input type="checkbox" aria-label="Select up to 25 unassigned orders" checked={allSelected} disabled={!unassigned.length} onChange={toggleAllOrders}/></th><th>Order</th><th>Customer</th><th>Fulfillment</th><th>Assign executive</th></tr></thead><tbody>{ordersSlice.map(o=>{const current=assignmentMap.get(String(o.id));return <tr key={o.id}><td className="nx55-select-cell"><input type="checkbox" aria-label={`Select order ${o.id} for batch assignment`} checked={selectedOrderIds.includes(String(o.id))&&!current} disabled={busy||!!current||(!selectedOrderIds.includes(String(o.id))&&selectedOrders.length>=25)} onChange={()=>toggleOrder(o.id)}/></td><td><strong>#{o.id}</strong><br/><small>{money(o.total)}</small></td><td>{o.customerName}<br/><small>{o.address?.city||'—'}</small></td><td><span className="nx46-pill">{o.status}</span>{current&&<small className="nx46-block">{current.deliveryStatus} · {current.executiveName}</small>}</td><td className="nx78-assignment-cell"><div className="nx53-order-action"><span className={`nx53-order-assignee ${current?"":"is-empty"}`} title={current?.executiveName||""}>{current?.executiveName||"Unassigned"}</span><button type="button" className="nx53-open-picker" disabled={busy||!!current&&current.deliveryStatus!=='assigned'} onClick={()=>openPicker(o)}><UiIcon name="users" size={16}/>{current?'Change executive':'Choose executive'}</button></div></td></tr>})}</tbody></table></div>}
   <div className="nx77-pagination"><span>Page {Math.min(ordersPage,ordersPages)} of {ordersPages}</span><button type="button" disabled={ordersPage<=1} onClick={()=>setOrdersPage(p=>p-1)}>Previous</button><button type="button" disabled={ordersPage>=ordersPages} onClick={()=>setOrdersPage(p=>p+1)}>Next</button></div>
  </section>
  <section className="admin-panel nx46-panel nx54-exception-section"><div className="admin-panel-heading"><div><h2>Delivery issues to review</h2><p>Review reported attempts and rescheduling requests before approving another delivery.</p></div><strong>{assignments.filter(a=>a.pendingIssue).length} pending</strong></div>
  {assignments.filter(a=>a.pendingIssue).length===0 ? <p>No delivery issues awaiting review.</p> :
   <div className="nx54-issue-grid">{assignments.filter(a=>a.pendingIssue).map(a=><article key={a.orderId} className="nx54-issue-card">
     <div><strong>Order #{a.orderId}</strong><span>{a.executiveName} · {a.customerName}</span></div>
     <span className="nx46-pill">{a.pendingIssue.kind==='reschedule_requested'?'Reschedule requested':'Failed attempt'}</span>
     <p>{a.pendingIssue.reason}</p>
     {a.pendingIssue.requestedDate&&<small>Proposed date: {String(a.pendingIssue.requestedDate).slice(0,10)}</small>}
     <button type="button" className="nx53-open-picker" disabled={busy} onClick={()=>setRetryOrder(a)}>Review & approve retry</button>
   </article>)}</div>}
  </section>
  <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Assignment activity</h2><p>Track assigned, out-for-delivery and completed orders.</p></div></div>
   <div className="nx77-table-toolbar"><label className="nx77-search-field"><UiIcon name="search" size={17}/><input type="search" placeholder="Search assignment, order or executive" aria-label="Search assignment history" value={activityQuery} onChange={e=>{setActivityQuery(e.target.value);setActivityPage(1);}}/></label><label className="nx77-filter-label">Delivery status<select value={activityStatus} onChange={e=>{setActivityStatus(e.target.value);setActivityPage(1);}}><option value="all">All statuses</option><option value="assigned">Assigned</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option></select></label><strong>{matchingActivity.length} matches</strong></div>
   {!matchingActivity.length?<p>No assignment history matches these filters.</p>:<div className="nx46-table-wrap"><table className="nx46-table"><thead><tr><th>Order</th><th>Executive</th><th>Delivery status</th><th>Order status</th><th>Assigned on</th></tr></thead><tbody>{activitySlice.map(a=><tr key={a.orderId}><td>#{a.orderId}</td><td>{a.executiveName}</td><td><span className={`nx46-pill ${a.deliveryStatus==='delivered'?'good':''}`}>{a.deliveryStatus.replaceAll('_',' ')}</span></td><td>{a.orderStatus}</td><td>{new Date(a.assignedAt).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div>}
   <div className="nx77-pagination"><span>Page {Math.min(activityPage,activityPages)} of {activityPages}</span><button type="button" disabled={activityPage<=1} onClick={()=>setActivityPage(p=>p-1)}>Previous</button><button type="button" disabled={activityPage>=activityPages} onClick={()=>setActivityPage(p=>p+1)}>Next</button></div>
  </section>
  {retryOrder&&<Modal title={`Approve delivery retry · #${retryOrder.orderId}`} subtitle="Only approve when a second delivery attempt has been coordinated." size="small" closeDisabled={busy} onClose={()=>{if(!busy)setRetryOrder(null);}}>
    <div className="nx54-retry-confirm"><p><strong>{retryOrder.executiveName}</strong> reported: {retryOrder.pendingIssue?.reason}</p>
    {retryOrder.pendingIssue?.requestedDate&&<p>Proposed date: {String(retryOrder.pendingIssue.requestedDate).slice(0,10)} (informational only, not an appointment booking).</p>}
    <p>The same executive remains assigned. Status returns to Assigned so they can start another attempt after dispatch.</p>
    <div className="nx46-modal-actions"><button type="button" disabled={busy} onClick={()=>setRetryOrder(null)}>Cancel</button><button type="button" disabled={busy} onClick={authorizeRetry}>{busy?'Updating…':'Approve retry'}</button></div></div>
  </Modal>}
  {bulkOpen&&selectedOrders.length>=2&&<DeliveryBatchAssignmentDialog orders={selectedOrders} staff={staff} assignments={assignments} busy={busy} error={bulkError} onAssign={assignBatchSelected} onClose={()=>{if(!busy)setBulkOpen(false);}}/>}
  {pickerOrder&&<DeliveryExecutivePicker key={pickerOrder.id} order={pickerOrder} current={assignmentMap.get(String(pickerOrder.id))} staff={staff} assignments={assignments} busy={busy} error={pickerError} onAssign={assignSelected} onClose={closePicker}/>}
  {pendingDelete&&<Modal title="Delete delivery executive?" subtitle="This action is permanent for accounts that have never handled a delivery." size="small" closeDisabled={busy} onClose={()=>{if(!busy)setPendingDelete(null);}}><div className="nx80-delete-confirm"><p>Delete <strong>{pendingDelete.fullName}</strong> ({pendingDelete.email})? This account will no longer be able to sign in.</p><p>Accounts with delivery history must be disabled instead so order audit records remain intact.</p><div className="nx46-modal-actions"><button type="button" disabled={busy} onClick={()=>setPendingDelete(null)}>Cancel</button><button type="button" className="nx80-delete-action" disabled={busy} onClick={removeUnusedStaff}>{busy?'Deleting…':'Delete account'}</button></div></div></Modal>}
  {form&&<Modal title={editingExecutive?`Edit ${editingExecutive.fullName}`:"Create delivery account"} subtitle={editingExecutive?"Updates to the rate apply only to future assigned deliveries.":"Only this person will be able to access assigned deliveries."} size="small" onClose={()=>{if(!busy)setForm(null);}}><form className="nx46-create-form nx80-delivery-form" onSubmit={create} noValidate>{error&&<p className="admin-alert" role="alert">{error}</p>}{[['fullName','Full name','text'],['email','Email','email'],['mobileNumber','Mobile number','tel'],['payRate','Pay per completed delivery (₹)','text'],...(!editingExecutive?[['password','Temporary password (12+ characters)','password']]:[])].map(([field,label,type])=><label key={field} htmlFor={`nx80-${field}`}><span>{label} <b className="nx80-required" aria-hidden="true">*</b></span><input id={`nx80-${field}`} type={type} required minLength={field==='password'?12:undefined} maxLength={field==='mobileNumber'?10:field==='fullName'?100:field==='email'?254:field==='payRate'?8:72} pattern={field==='mobileNumber'?'[0-9]{10}':undefined} inputMode={field==='mobileNumber'?'numeric':field==='payRate'?'decimal':undefined} aria-invalid={Boolean(formErrors[field])} aria-describedby={formErrors[field]?`nx80-${field}-error`:undefined} value={form[field]} autoComplete="off" onBlur={()=>setFormErrors(e=>({...e,[field]:deliveryFieldError(field,form[field])}))} onChange={e=>{const value=field==='mobileNumber'?e.target.value.replace(/\D/g,'').slice(0,10):e.target.value;setForm(f=>({...f,[field]:value}));if(formErrors[field])setFormErrors(prev=>({...prev,[field]:deliveryFieldError(field,value)}));}}/>{formErrors[field]&&<small id={`nx80-${field}-error`} className="nx80-field-error" role="alert">{formErrors[field]}</small>}</label>)}<p>Share credentials privately. Do not use a customer's existing email.</p><div className="nx46-modal-actions"><button type="button" disabled={busy} onClick={()=>{setForm(null);setEditingExecutive(null);}}>Cancel</button><button type="submit" disabled={busy}>{busy?'Saving…':editingExecutive?'Save executive':'Create account'}</button></div></form></Modal>}
 </AdminLayout>;
}
