import usePagination from '../../hooks/usePagination';
import { Button, Card, Checkbox, ClearFilters, DataTable, EmptyState, FormField, FilterToolbarActions, Pagination, SearchField, Select, StatusBadge, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TextField } from "../../components/ui/index";

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
 const [orderQuery,setOrderQuery]=useState(''),[orderStatus,setOrderStatus]=useState('all');
 const [activityQuery,setActivityQuery]=useState(''),[activityStatus,setActivityStatus]=useState('all');
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
    const message=e.status===404?'The running backend does not have the delivery API. Check the Nexora backend URL and restart the API server.':e.message;
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
 const {page:ordersPage,pages:ordersPages,items:ordersSlice,setPage:setOrdersPage}=usePagination(matchingOrders,JSON.stringify([orderQuery,orderStatus]));
 const matchingActivity=assignments.filter(a=>`${a.orderId} ${a.executiveName||''} ${a.customerName||''}`.toLowerCase().includes(activityQuery.trim().toLowerCase())&&(activityStatus==='all'||a.deliveryStatus===activityStatus));
 const {page:activityPage,pages:activityPages,items:activitySlice,setPage:setActivityPage}=usePagination(matchingActivity,JSON.stringify([activityQuery,activityStatus]));
 const pickerOrder=candidates.find(o=>String(o.id)===String(pickerOrderId));
 useEffect(()=>{if(loading||!serviceReady||!requestedOrderId)return;
   let active=true;queueMicrotask(()=>{if(!active)return;
     if(candidates.some(o=>String(o.id)===requestedOrderId)){setPickerOrderId(requestedOrderId);setPickerError('');}
     else setNotice(`Order #${requestedOrderId} is not eligible for delivery assignment.`);
     setSearchParams({}, {replace:true});
   });return()=>{active=false;};
  },[loading,serviceReady,requestedOrderId,candidates,setSearchParams]);
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
 return <AdminLayout title="Delivery operations" subtitle="Manage your delivery team, assign ready orders, and follow their progress." actions={<Button variant="primary"  disabled={loading||!serviceReady} onClick={()=>{setEditingExecutive(null);setForm({fullName:'',email:'',mobileNumber:'',password:'',payRate:'0.00'});setFormErrors({});setError('');}}>+ Add delivery person</Button>}>
  {serviceError&&<div className="admin-alert nx51-service-warning" role="alert"><strong>Delivery setup needs attention</strong><p>{serviceError}</p><p>Check <code>/api/admin/delivery/health</code> while signed in as admin. Do not create a delivery account until the API is ready.</p></div>}
  {error&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p className="nx46-success" role="status">{notice}</p>}
  <section className="nx46-metrics"><article><span>Delivery staff</span><strong>{staff.length}</strong><small>{staff.filter(s=>s.isActive).length} active</small></article><article><span>Eligible orders</span><strong>{candidates.length}</strong><small>Confirmed / preparing / dispatched</small></article><article><span>Out for delivery</span><strong>{assignments.filter(a=>a.deliveryStatus==='out_for_delivery').length}</strong><small>Currently with executives</small></article><article><span>Delivered</span><strong>{assignments.filter(a=>a.deliveryStatus==='delivered').length}</strong><small>Completed assignments</small></article></section>
  <Link to="/admin/finance" className="nx81-finance-link"><UiIcon name="right" size={17}/> View revenue, COD collection and delivery payouts</Link>
  <Card as="section" className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Delivery team</h2><p>Manage executive profiles, future pay rates, workload and account access.</p></div></div>
    <DeliveryTeamTable staff={workload} loading={loading} busy={busy}
      onEdit={member=>{setEditingExecutive(member);setForm({fullName:member.fullName,email:member.email,mobileNumber:member.mobile,password:'',payRate:String(member.payRate||'0.00')});setFormErrors({});setError('');}}
      onToggle={toggle} onDelete={setPendingDelete}/>
  </Card>
  <Card as="section" className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Assign delivery orders</h2><p>Dispatch an order using Orders before the executive can mark it out for delivery.</p></div><Link className="nx78-panel-link" to="/admin/orders"><span>Manage orders</span><UiIcon name="right" size={17}/></Link></div>
   <div className="nx55-batch-toolbar"><div><strong>Multi-order assignment</strong><small>Select 2–25 unassigned orders and give them to one executive. Each order still has only one assigned executive.</small></div><div><span>{selectedOrders.length} selected</span><Button variant="secondary" type="button" className="nx53-open-picker" disabled={busy||selectedOrders.length<2} onClick={()=>{setBulkError('');setBulkOpen(true);}}><UiIcon name="users" size={16}/> Assign selected</Button></div></div>
   <div className="nx77-table-toolbar"><SearchField placeholder="Search order, customer or city" aria-label="Search delivery orders" value={orderQuery} onChange={e=>{setOrderQuery(e.target.value);setOrdersPage(1);}}/><FormField className="nx77-filter-label">Assignment<Select value={orderStatus} onChange={e=>{setOrderStatus(e.target.value);setOrdersPage(1);}}><option value="all">All eligible orders</option><option value="unassigned">Unassigned</option><option value="assigned">Assigned</option></Select></FormField><FilterToolbarActions><strong className="nx-ui-filter-count">{matchingOrders.length} matches</strong><ClearFilters active={Boolean(orderQuery)||orderStatus!=="all"} onClear={()=>{setOrderQuery("");setOrderStatus("all");setOrdersPage(1);}}/></FilterToolbarActions></div>
   {!matchingOrders.length?<EmptyState title="No eligible orders" description="Try adjusting assignment filters."/>:<TableContainer className="nx46-table-wrap nx73-assignment-wrap"><DataTable className="nx46-table nx73-assignment-table"><TableHead><TableRow><TableHeader className="nx55-select-th"><Checkbox type="checkbox" aria-label="Select up to 25 unassigned orders" checked={allSelected} disabled={!unassigned.length} onChange={toggleAllOrders}/></TableHeader><TableHeader>Order</TableHeader><TableHeader>Customer</TableHeader><TableHeader>Fulfillment</TableHeader><TableHeader className="nx78-assignment-heading"><span>Assign executive</span></TableHeader></TableRow></TableHead><TableBody>{ordersSlice.map(o=>{const current=assignmentMap.get(String(o.id));return <TableRow key={o.id}><TableCell className="nx55-select-cell"><Checkbox type="checkbox" aria-label={`Select order ${o.id} for batch assignment`} checked={selectedOrderIds.includes(String(o.id))&&!current} disabled={busy||!!current||(!selectedOrderIds.includes(String(o.id))&&selectedOrders.length>=25)} onChange={()=>toggleOrder(o.id)}/></TableCell><TableCell numeric><strong>#{o.id}</strong><br/><small>{money(o.total)}</small></TableCell><TableCell>{o.customerName}<br/><small>{o.address?.city||'—'}</small></TableCell><TableCell><StatusBadge tone="neutral" >{o.status}</StatusBadge>{current&&<small className="nx46-block">{current.deliveryStatus} · {current.executiveName}</small>}</TableCell><TableCell className="nx78-assignment-cell"><div className="nx53-order-action"><span className={`nx53-order-assignee ${current?"":"is-empty"}`} title={current?.executiveName||""}>{current?.executiveName||"Unassigned"}</span><Button variant="secondary" type="button" className="nx53-open-picker" disabled={busy||!!current&&current.deliveryStatus!=='assigned'} onClick={()=>openPicker(o)}><UiIcon name="users" size={16}/>{current?'Change executive':'Choose executive'}</Button></div></TableCell></TableRow>})}</TableBody></DataTable></TableContainer>}
   <Pagination page={ordersPage} pages={ordersPages} total={matchingOrders.length} label="eligible orders" onPageChange={setOrdersPage}/>
  </Card>
  <Card as="section" className="admin-panel nx46-panel nx54-exception-section"><div className="admin-panel-heading"><div><h2>Delivery issues to review</h2><p>Review reported attempts and rescheduling requests before approving another delivery.</p></div><strong>{assignments.filter(a=>a.pendingIssue).length} pending</strong></div>
  {assignments.filter(a=>a.pendingIssue).length===0 ? <EmptyState icon="check-circle" title="No delivery issues awaiting review" description="Issues reported by your delivery team will appear here."/> :
   <div className="nx54-issue-grid">{assignments.filter(a=>a.pendingIssue).map(a=><article key={a.orderId} className="nx54-issue-card">
     <div><strong>Order #{a.orderId}</strong><span>{a.executiveName} · {a.customerName}</span></div>
     <StatusBadge tone="neutral" >{a.pendingIssue.kind==='reschedule_requested'?'Reschedule requested':'Failed attempt'}</StatusBadge>
     <p>{a.pendingIssue.reason}</p>
     {a.pendingIssue.requestedDate&&<small>Proposed date: {String(a.pendingIssue.requestedDate).slice(0,10)}</small>}
     <Button variant="secondary" type="button" className="nx53-open-picker" disabled={busy} onClick={()=>setRetryOrder(a)}>Review & approve retry</Button>
   </article>)}</div>}
  </Card>
  <Card as="section" className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Assignment activity</h2><p>Track assigned, out-for-delivery and completed orders.</p></div></div>
   <div className="nx77-table-toolbar"><SearchField placeholder="Search assignment, order or executive" aria-label="Search assignment history" value={activityQuery} onChange={e=>{setActivityQuery(e.target.value);setActivityPage(1);}}/><FormField className="nx77-filter-label">Delivery status<Select value={activityStatus} onChange={e=>{setActivityStatus(e.target.value);setActivityPage(1);}}><option value="all">All statuses</option><option value="assigned">Assigned</option><option value="out_for_delivery">Out for delivery</option><option value="delivered">Delivered</option></Select></FormField><FilterToolbarActions><strong className="nx-ui-filter-count">{matchingActivity.length} matches</strong><ClearFilters active={Boolean(activityQuery)||activityStatus!=="all"} onClear={()=>{setActivityQuery("");setActivityStatus("all");setActivityPage(1);}}/></FilterToolbarActions></div>
   {!matchingActivity.length?<EmptyState title="No assignment history" description="Completed assignments and updates will appear here."/>:<TableContainer className="nx46-table-wrap"><DataTable className="nx46-table"><TableHead><TableRow><TableHeader>Order</TableHeader><TableHeader>Executive</TableHeader><TableHeader>Delivery status</TableHeader><TableHeader>Order status</TableHeader><TableHeader>Assigned on</TableHeader></TableRow></TableHead><TableBody>{activitySlice.map(a=><TableRow key={a.orderId}><TableCell>#{a.orderId}</TableCell><TableCell>{a.executiveName}</TableCell><TableCell><StatusBadge tone={a.deliveryStatus==='delivered' ? "success" : "neutral"} >{a.deliveryStatus.replaceAll('_',' ')}</StatusBadge></TableCell><TableCell>{a.orderStatus}</TableCell><TableCell>{new Date(a.assignedAt).toLocaleDateString('en-IN')}</TableCell></TableRow>)}</TableBody></DataTable></TableContainer>}
   <Pagination page={activityPage} pages={activityPages} total={matchingActivity.length} label="assignments" onPageChange={setActivityPage}/>
  </Card>
  {retryOrder&&<Modal title={`Approve delivery retry · #${retryOrder.orderId}`} subtitle="Only approve when a second delivery attempt has been coordinated." size="small" closeDisabled={busy} onClose={()=>{if(!busy)setRetryOrder(null);}}>
    <div className="nx54-retry-confirm"><p><strong>{retryOrder.executiveName}</strong> reported: {retryOrder.pendingIssue?.reason}</p>
    {retryOrder.pendingIssue?.requestedDate&&<p>Proposed date: {String(retryOrder.pendingIssue.requestedDate).slice(0,10)} (informational only, not an appointment booking).</p>}
    <p>The same executive remains assigned. Status returns to Assigned so they can start another attempt after dispatch.</p>
    <div className="nx46-modal-actions"><Button variant="secondary" type="button" disabled={busy} onClick={()=>setRetryOrder(null)}>Cancel</Button><Button variant="secondary" type="button" disabled={busy} onClick={authorizeRetry}>{busy?'Updating…':'Approve retry'}</Button></div></div>
  </Modal>}
  {bulkOpen&&selectedOrders.length>=2&&<DeliveryBatchAssignmentDialog orders={selectedOrders} staff={staff} assignments={assignments} busy={busy} error={bulkError} onAssign={assignBatchSelected} onClose={()=>{if(!busy)setBulkOpen(false);}}/>}
  {pickerOrder&&<DeliveryExecutivePicker key={pickerOrder.id} order={pickerOrder} current={assignmentMap.get(String(pickerOrder.id))} staff={staff} assignments={assignments} busy={busy} error={pickerError} onAssign={assignSelected} onClose={closePicker}/>}
  {pendingDelete&&<Modal title="Delete delivery executive?" subtitle="This action is permanent for accounts that have never handled a delivery." size="small" closeDisabled={busy} onClose={()=>{if(!busy)setPendingDelete(null);}}><div className="nx80-delete-confirm"><p>Delete <strong>{pendingDelete.fullName}</strong> ({pendingDelete.email})? This account will no longer be able to sign in.</p><p>Accounts with delivery history must be disabled instead so order audit records remain intact.</p><div className="nx46-modal-actions"><Button variant="secondary" type="button" disabled={busy} onClick={()=>setPendingDelete(null)}>Cancel</Button><Button variant="secondary" type="button" className="nx80-delete-action" disabled={busy} onClick={removeUnusedStaff}>{busy?'Deleting…':'Delete account'}</Button></div></div></Modal>}
  {form&&<Modal title={editingExecutive?`Edit ${editingExecutive.fullName}`:"Create delivery account"} subtitle={editingExecutive?"Updates to the rate apply only to future assigned deliveries.":"Only this person will be able to access assigned deliveries."} size="small" onClose={()=>{if(!busy)setForm(null);}}><form className="nx46-create-form nx80-delivery-form" onSubmit={create} noValidate>{error&&<p className="admin-alert" role="alert">{error}</p>}{[['fullName','Full name','text'],['email','Email','email'],['mobileNumber','Mobile number','tel'],['payRate','Pay per completed delivery (₹)','text'],...(!editingExecutive?[['password','Temporary password (12+ characters)','password']]:[])].map(([field,label,type])=><FormField key={field} htmlFor={`nx80-${field}`}><span>{label} <b className="nx80-required" aria-hidden="true">*</b></span><TextField id={`nx80-${field}`} type={type} required minLength={field==='password'?12:undefined} maxLength={field==='mobileNumber'?10:field==='fullName'?100:field==='email'?254:field==='payRate'?8:72} pattern={field==='mobileNumber'?'[0-9]{10}':undefined} inputMode={field==='mobileNumber'?'numeric':field==='payRate'?'decimal':undefined} aria-invalid={Boolean(formErrors[field])} aria-describedby={formErrors[field]?`nx80-${field}-error`:undefined} value={form[field]} autoComplete="off" onBlur={()=>setFormErrors(e=>({...e,[field]:deliveryFieldError(field,form[field])}))} onChange={e=>{const value=field==='mobileNumber'?e.target.value.replace(/\D/g,'').slice(0,10):e.target.value;setForm(f=>({...f,[field]:value}));if(formErrors[field])setFormErrors(prev=>({...prev,[field]:deliveryFieldError(field,value)}));}}/>{formErrors[field]&&<small id={`nx80-${field}-error`} className="nx80-field-error" role="alert">{formErrors[field]}</small>}</FormField>)}<p>Share credentials privately. Do not use a customer's existing email.</p><div className="nx46-modal-actions"><Button variant="secondary" type="button" disabled={busy} onClick={()=>{setForm(null);setEditingExecutive(null);}}>Cancel</Button><Button variant="primary" type="submit" disabled={busy}>{busy?'Saving…':editingExecutive?'Save executive':'Create account'}</Button></div></form></Modal>}
 </AdminLayout>;
}
