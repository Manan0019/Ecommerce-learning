import { useEffect, useMemo, useState } from "react";
import UiIcon from "../../components/common/UiIcon";
import Modal from "../../components/common/Modal";
import { apiAssetUrl } from "../../services/apiClient";
import AdminLayout from "../../components/layout/AdminLayout";
import {Link} from "react-router-dom";
import OrderTimeline from "../../components/customer/OrderTimeline";
import OrderActionDialog from "../../components/admin/OrderActionDialog";
import DeliveryExecutivePicker from "../../components/admin/DeliveryExecutivePicker";
import { getDeliveryStaff, getAdminAssignments, assignDelivery } from "../../services/deliveryService";
import { getAdminOrders, updateCodStatus, confirmCodCollection, expireUnpaidRazorpayOrder, requestRazorpayRefund, reconcileRazorpayRefund, getRazorpayRefundConfig, declineOrderCancellation } from "../../services/orderService";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const nextStatuses={placed:["confirmed","cancelled"],confirmed:["processing","cancelled"],processing:["shipped"],shipped:["delivered"],delivered:[],cancelled:[]};
const labels={confirmed:"Confirm order",processing:"Mark preparing",delivered:"Mark delivered"};

export default function AdminOrders({ embeddedOrderId = null, onEmbeddedClose, onOrdersChanged }){
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(""),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const [dispatchId,setDispatchId]=useState(null),[partner,setPartner]=useState(""),[tracking,setTracking]=useState("");
 const [dialog,setDialog]=useState(null),[dialogError,setDialogError]=useState(""),[notice,setNotice]=useState("");
 const [refundConfig,setRefundConfig]=useState(null);
 const [assignmentOrderId,setAssignmentOrderId]=useState(null);
 const [selectedOrderId,setSelectedOrderId]=useState(embeddedOrderId);
 const [orderPage,setOrderPage]=useState(1),[orderSort,setOrderSort]=useState("newest");
 const [assignmentData,setAssignmentData]=useState({staff:[],assignments:[]});
 const [assignmentLoading,setAssignmentLoading]=useState(false);
 const [assignmentError,setAssignmentError]=useState("");
 const assignmentOrder=orders.find(o=>String(o.id)===String(assignmentOrderId));
 const existingAssignment=assignmentData.assignments.find(a=>String(a.orderId)===String(assignmentOrderId));
 async function openAssignmentPicker(order){
   setAssignmentOrderId(order.id);setAssignmentLoading(true);setAssignmentError("");
   try {const [team,history]=await Promise.all([getDeliveryStaff(),getAdminAssignments()]);
    setAssignmentData({staff:team.staff||[],assignments:history.assignments||[]});}
   catch(e){setAssignmentError(e.message);}
   finally{setAssignmentLoading(false);}
 }
 function closeAssignmentPicker(){if(!assignmentLoading&&!busy){setAssignmentOrderId(null);setAssignmentError("");}}
 async function submitAssignment(executiveId){
   if(!assignmentOrder)return;
   setBusy(String(assignmentOrder.id));setAssignmentError("");
   try{await assignDelivery(assignmentOrder.id,executiveId);
     await refreshOrders();setAssignmentOrderId(null);
     setNotice(`Order #${assignmentOrder.id} assigned to the selected executive.`);}
   catch(e){setAssignmentError(e.message);}
   finally{setBusy("");}
 }
 useEffect(()=>{const c=new AbortController();getRazorpayRefundConfig(c.signal).then(setRefundConfig).catch(()=>{});return()=>c.abort();},[]);
 const openDialog=(type,order,status)=>{setDialog({type,order,status});setDialogError("");setError("");setNotice("");};
 const closeDialog=()=>{if(!busy){setDialog(null);setDialogError("");}};
 useEffect(()=>{const c=new AbortController();getAdminOrders(c.signal).then(async d=>{
  if(c.signal.aborted)return;
  const initial=d.orders||[];setOrders(initial);
  // A legacy refund webhook may have carried receipt:null. When admin opens
  // Orders, reconcile at most two pending refunds against the provider API.
  // No refund request is created here: reconciliation is read-only at Razorpay.
  const pending=initial.filter(o=>o.paymentMethod==='Razorpay'&&o.refundStatus&&o.refundStatus!=='processed').slice(0,2);
  if(pending.length){await Promise.allSettled(pending.map(o=>reconcileRazorpayRefund(o.id)));
    if(!c.signal.aborted){try{const fresh=await getAdminOrders(c.signal);setOrders(fresh.orders||[]);}catch{/* Preserve loaded orders */}}}
 }).catch(e=>{if(e.name!=="AbortError")setError(e.message)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort();},[]);
 async function refreshOrders(){const result=await getAdminOrders();setOrders(result.orders||[]);onOrdersChanged?.();}
 async function setStatus(order,status){
  if(status==="cancelled"&&order.paymentMethod==="Razorpay"){setError("Paid Razorpay orders cannot be cancelled here until their refund is reconciled.");return;}
  if(status==="shipped"&&!partner.trim()){setError("Enter a delivery partner before dispatching the order.");return;}
  setBusy(order.id);setError("");try{
   await updateCodStatus(order.id,status,status==="shipped"?{deliveryPartner:partner,trackingReference:tracking}:{});
   await refreshOrders();setDispatchId(null);setPartner("");setTracking("");window.dispatchEvent(new Event("nexora:inventory-updated"));return true;
  }catch(e){setError(e.message);return false}finally{setBusy("")}
 }
 async function expirePayment(order){
  setBusy(order.id);setError('');try{await expireUnpaidRazorpayOrder(order.id);await refreshOrders();window.dispatchEvent(new Event('nexora:inventory-updated'));return true;}catch(e){setError(e.message);return false}finally{setBusy('')}
 }
 async function submitRefund(order,reason){
  setBusy(order.id);setError('');setDialogError('');try{
   const result=await requestRazorpayRefund(order.id,reason);
   await refreshOrders();setDialog(null);
   if(result.message)setNotice(result.message);
   window.dispatchEvent(new Event('nexora:inventory-updated'));
  }catch(e){setDialogError(e.message);
   if(e.message?.includes('disabled'))getRazorpayRefundConfig().then(setRefundConfig).catch(()=>{});
  }finally{setBusy('')}
 }
 async function confirmDialog(reason){
  if(!dialog)return;
  const {type,order,status}=dialog;
  if(type==='refund')return submitRefund(order,reason);
  if(type==='decline-cancel'){setBusy(order.id);setDialogError('');try{await declineOrderCancellation(order.id,reason);await refreshOrders();setDialog(null);setNotice('Customer cancellation request declined; fulfillment is available again.');}catch(e){setDialogError(e.message);}finally{setBusy('');}return;}
  if(type==='cancel-cod'||type==='delivered'){
   const ok=await setStatus(order,status,true);if(ok)setDialog(null);else setDialogError('Action failed. Review the message above and try again.');return;
  }
  if(type==='expire'){
   const ok=await expirePayment(order);if(ok)setDialog(null);else setDialogError('Action failed. Review the message above.');return;
  }
  if(type==='collect'){
   const ok=await collectCash(order);if(ok)setDialog(null);else setDialogError('Action failed. Review the message above.');
  }
 }
 async function checkRefund(order){
  setBusy(order.id);setError('');try{const result=await reconcileRazorpayRefund(order.id);
   await refreshOrders();if(result.message)setNotice(result.message);
   window.dispatchEvent(new Event('nexora:inventory-updated'));
  }catch(e){setError(e.message)}finally{setBusy('')}
 }
 async function collectCash(order){
  setBusy(order.id);setError("");try{await confirmCodCollection(order.id);await refreshOrders();return true;}catch(e){setError(e.message);return false}finally{setBusy("")}
 }
 const totals=useMemo(()=>({placed:orders.filter(o=>o.status==="placed").length,progress:orders.filter(o=>["confirmed","processing","shipped"].includes(o.status)).length,delivered:orders.filter(o=>o.status==="delivered").length,orderValue:orders.filter(o=>!['cancelled','payment_pending','payment_expired','payment_review','refund_pending','refund_review'].includes(o.status)).reduce((a,o)=>a+Number(o.total),0)}),[orders]);
 const pendingCancellationCount=orders.filter(o=>o.cancellationRequest?.status==="pending").length;
 const visible=orders.filter(o=>(filter==="all" || (filter==="active" ? ['placed','confirmed','processing','shipped'].includes(o.status) : filter==="payments" ? ['payment_pending','payment_review','refund_pending','refund_review','payment_expired'].includes(o.status) : filter==="archive" ? ['delivered','cancelled','payment_expired'].includes(o.status) : filter==="cancellation_requested" ? o.cancellationRequest?.status==="pending" : filter===o.status)) && `${o.id} ${o.customerName} ${o.customerEmail}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>orderSort==='oldest'?new Date(a.placedAt)-new Date(b.placedAt):new Date(b.placedAt)-new Date(a.placedAt));
 const perPage=25;const pages=Math.max(1,Math.ceil(visible.length/perPage));const currentPage=Math.min(orderPage,pages);const pageOrders=visible.slice((currentPage-1)*perPage,currentPage*perPage);
 return <>{!embeddedOrderId && <AdminLayout title="Orders & fulfillment" subtitle="Track COD and Razorpay payments, then process verified orders for dispatch and delivery.">
 {error&&<div className="admin-alert" role="alert">{error}</div>}
 {notice&&<div className="nx44-admin-notice" role="status">{notice}<button type="button" onClick={()=>setNotice("")} className="nx64-animated-close nx65-close-control" aria-label="Dismiss message"><UiIcon name="x" size={15}/></button></div>}
 {refundConfig?.enabled===false&&<div className="nx44-admin-refund-status" role="status"><strong>Razorpay refunds disabled.</strong> {refundConfig.reason==='refund_opt_in_missing'?'Add RAZORPAY_REFUNDS_ENABLED=true to server/.env, keep RAZORPAY_MODE=test, and restart Express.':refundConfig.reason==='razorpay_unconfigured'?'Check test Razorpay API settings in server/.env.':'Refund access needs separate authorization in Live Mode.'}</div>}
 {pendingCancellationCount>0&&<button className="nx45-review-shortcut" type="button" onClick={()=>setFilter('cancellation_requested')}>Cancellation requests awaiting review <strong>{pendingCancellationCount}</strong><span>View requests <UiIcon name="right" size={17}/></span></button>}
 <div className="nx-admin-summary nx-cod-admin-stats"><div><small>Orders loaded</small><strong>{orders.length}</strong></div><div><small>Awaiting review</small><strong>{totals.placed}</strong></div><div><small>In progress</small><strong>{totals.progress}</strong></div><div><small>Delivered</small><strong>{totals.delivered}</strong></div></div>
 <section className="admin-panel nx-admin-orders-panel"><div className="admin-panel-heading"><div><h2>Order queue</h2><p>COD and Razorpay orders. Online payment must be captured before fulfillment; COD collection is recorded manually.</p><small>Non-cancelled order value: {money(totals.orderValue)}</small></div></div>
 <div className="nx-cod-toolbar"><label className="nx69-search"><span className="sr-only">Search orders</span><UiIcon name="search" size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setOrderPage(1);}} placeholder="Search by order, customer or email" type="search"/></label><label>Status <select value={filter} onChange={e=>{setFilter(e.target.value);setOrderPage(1);setSelectedOrderId(null);}}>{["all","active","payments","archive","cancellation_requested","placed","confirmed","processing","shipped","delivered","cancelled","payment_pending","payment_review","payment_expired","refund_pending","refund_review"].map(s=><option value={s} key={s}>{s==="cancellation_requested"?"Cancellation requests":s==="active"?"Active fulfillment":s==="payments"?"Payment issues":s==="archive"?"Delivered / cancelled":s[0].toUpperCase()+s.slice(1)}</option>)}</select></label><label>Order <select value={orderSort} onChange={e=>{setOrderSort(e.target.value);setOrderPage(1);}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
 {loading?<div role="status" aria-live="polite" className="nx65-order-loading"><span className="sr-only">Loading orders…</span>{Array.from({length:5},(_,i)=><div className="nx65-loading-row" aria-hidden="true" key={i}><span/><span/><span/><span/></div>)}</div>:!visible.length?<p className="nx-cod-padding">No orders match this view.</p>:<div className="nx57-order-workspace">
   <div className="nx57-orders-table-wrap"><table className="nx57-orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Payment</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageOrders.map(o=><tr key={o.id} className={String(selectedOrderId)===String(o.id)?'is-selected':''}>
     <td><button type="button" className="nx57-order-link" onClick={()=>setSelectedOrderId(o.id)}>#{o.id}</button></td>
     <td><strong className="nx57-table-truncate" title={o.customerName||'Customer'}>{o.customerName||'Customer'}</strong><small className="nx57-table-truncate">{o.customerEmail}</small></td>
     <td>{new Date(o.placedAt).toLocaleDateString('en-IN')}</td><td><span className="nx57-payment-type">{o.paymentMethod==='Razorpay'?'Prepaid':'COD'}</span><small>{o.paymentStatus==='razorpay_paid'?'Paid':o.paymentStatus==='cod_collected'?'Collected':o.status==='payment_pending'?'Awaiting payment':''}</small></td>
     <td className="nx57-order-amount">{money(o.total)}</td><td><span className={`nx-status nx-status-${o.status}`}>{o.status.replaceAll('_',' ')}</span></td>
     <td><button type="button" className="nx57-open-order" onClick={()=>setSelectedOrderId(o.id)} aria-label={`Manage order ${o.id}`}>View & manage</button></td>
   </tr>)}</tbody></table></div>
   <div className="nx57-order-pagination"><span>Showing {(currentPage-1)*perPage+1}–{Math.min(visible.length,currentPage*perPage)} of {visible.length} orders</span><div><button type="button" disabled={currentPage<=1} onClick={()=>{setOrderPage(currentPage-1);setSelectedOrderId(null);}}>Previous</button><span>Page {currentPage} / {pages}</span><button type="button" disabled={currentPage>=pages} onClick={()=>{setOrderPage(currentPage+1);setSelectedOrderId(null);}}>Next</button></div></div>
   <p className="nx57-orders-hint">Open an order to manage fulfillment, payment, delivery and refunds without leaving this list.</p>
 </div>}
 </section>
 </AdminLayout>}
 {embeddedOrderId && loading && <Modal title={`Manage order #${embeddedOrderId}`} size="order" onClose={onEmbeddedClose}><div className="nx65-order-loading" role="status">Loading order details…</div></Modal>}
   {embeddedOrderId && !loading && !orders.some(o=>String(o.id)===String(selectedOrderId)) && <Modal title={`Manage order #${embeddedOrderId}`} size="order" onClose={onEmbeddedClose}><p role="alert">{error || "This order is not available. Refresh the dashboard and try again."}</p></Modal>}
   {orders.filter(o=>String(o.id)===String(selectedOrderId)).map(o=><Modal key={o.id} size="order" title={`Manage order #${o.id}`} subtitle={`${o.customerName||"Customer"} · ${new Date(o.placedAt).toLocaleString("en-IN")}`} closeDisabled={!!busy} onClose={()=>{setSelectedOrderId(null);setDispatchId(null);setError("");onEmbeddedClose?.();}}>
    <div className="nx59-order-detail" aria-label={`Order ${o.id} details`}>{error&&<div className="admin-alert" role="alert">{error}</div>}{notice&&<div className="nx44-admin-notice" role="status">{notice}</div>}
    <div className="nx-admin-orders-grid"><article className="nx-admin-order-card">   <header><div><strong>Order #{o.id}</strong><small>{new Date(o.placedAt).toLocaleString("en-IN")}</small></div><span className={`nx-status nx-status-${o.status}`}>{o.status}</span></header>
   <div className="nx-admin-order-meta nx65-order-overview"><div className="nx65-customer-details"><span className="nx65-label">CUSTOMER</span><strong>{o.customerName||"Customer"}</strong><span title={o.customerEmail||""}>{o.customerEmail||"No email on order"}</span></div><div className="nx34-order-total nx65-total-details"><small>{o.paymentMethod==="Razorpay"?"ONLINE PAYMENT":"CASH ON DELIVERY"}</small><strong>{money(o.total)}</strong></div></div>
   <div className="nx-admin-order-items nx65-order-items">{o.items.map((item,i)=><div className="nx34-admin-order-line" key={`${item.productId}-${item.variantId||"base"}-${i}`}><div className="nx65-order-product">{item.imageUrl&&<img className="nx65-order-thumb" src={apiAssetUrl(item.imageUrl)} alt="" loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/>}<div className="nx34-order-line-info"><Link className="nx46-product-title" to={`/admin/products/${item.productId}/preview`} state={{from:"/admin/orders"}}>{item.name}</Link>{item.sku&&<small>SKU: {item.sku}</small>}</div></div><div className="nx34-order-line-numbers"><span className="nx34-order-quantity">Qty {item.quantity}</span><strong>{money(item.lineTotal??Number(item.unitPrice||0)*Number(item.quantity||0))}</strong></div></div>)}</div>
   <div className="nx25-order-breakdown"><span><span>Items subtotal</span><strong>{money(o.subtotal)}</strong></span><span><span>Shipping</span><strong>{money(o.shippingFee)}</strong></span><span><span>{o.taxPricingMode==='exclusive'?'GST added':'GST included'}</span><strong>{money(o.taxTotal)}</strong></span></div>
   <OrderTimeline order={o}/>
   {o.cancellationRequest&&<section className={`nx45-admin-request is-${o.cancellationRequest.status}`} aria-label="Customer cancellation request"><div><strong>Customer cancellation · {o.cancellationRequest.status}</strong><p>{o.cancellationRequest.reason}</p>{o.cancellationRequest.adminResponse&&<small>Admin response: {o.cancellationRequest.adminResponse}</small>}</div>{o.cancellationRequest.status==='pending'&&<div className="nx45-request-buttons"><button type="button" disabled={busy===o.id} onClick={()=>openDialog(o.paymentMethod==='Razorpay'?'refund':'cancel-cod',o,'cancelled')}>{o.paymentMethod==='Razorpay'?'Approve & refund':'Approve & cancel COD'}</button><button type="button" disabled={busy===o.id} onClick={()=>openDialog('decline-cancel',o)}>Decline request</button></div>}</section>}

   <details><summary>Delivery address</summary><p>{o.address.fullName}, {o.address.phone}</p><p>{o.address.addressLine1}, {o.address.addressLine2}</p><p>{o.address.city}, {o.address.state} — {o.address.pincode}</p></details>
   {dispatchId===o.id&&<form className="nx38-dispatch-form" onSubmit={e=>{e.preventDefault();setStatus(o,"shipped")}}><h3>Dispatch details</h3><label>Courier or delivery service <span aria-hidden="true">*</span><input required maxLength={80} value={partner} onChange={e=>setPartner(e.target.value)} placeholder="e.g. Nexora in-house, Delhivery, Shiprocket"/></label><label>Courier tracking ID (optional)<input maxLength={100} value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="Provided by the courier; not live-tracked automatically"/></label><div><button className="nx-cod-action" type="submit" disabled={busy===o.id}>Confirm dispatch</button><button type="button" className="nx38-neutral-action" onClick={()=>setDispatchId(null)}>Back</button></div></form>}
   <footer><small>{o.paymentMethod==='Razorpay'?(o.refundStatus==='processed'?'Full refund processed · order cancelled':o.refundStatus==='failed'?'Refund failed · manual review required':o.refundStatus?'Refund '+o.refundStatus+' · awaiting confirmation':o.paymentStatus==='razorpay_paid'?'✓ Paid via Razorpay':o.paymentStatus==='razorpay_review'?'Payment requires manual review':o.paymentStatus==='razorpay_expired'?'Unpaid reservation expired':'Awaiting payment · stock reserved'):(o.paymentStatus==='cod_collected'?'COD cash collection recorded':'COD · cash collection not recorded')}</small><div>
     {o.paymentMethod==='Razorpay'&&['placed','confirmed'].includes(o.status)&&o.paymentStatus==='razorpay_paid'&&!o.refundStatus&&o.cancellationRequest?.status!=='pending'&&<button type="button" className="nx-danger-action" disabled={busy===o.id} onClick={()=>openDialog("refund",o)}>Full refund & cancel</button>}
     {o.refundStatus&&o.refundStatus!=='processed'&&<button type="button" className="nx38-neutral-action" disabled={busy===o.id} onClick={()=>checkRefund(o)}>Check refund status</button>}
     {o.status==='payment_pending'&&<button type="button" className="nx38-neutral-action" disabled={busy===o.id} onClick={()=>openDialog("expire",o)}>Verify & expire after 60 min</button>}
     {(o.cancellationRequest?.status==='pending'?[]:(nextStatuses[o.status]||[])).filter(status=>!(o.paymentMethod==='Razorpay'&&status==='cancelled')).map(status=>status==="shipped"?<button key={status} type="button" className="nx-cod-action" disabled={busy===o.id} onClick={()=>{setDispatchId(o.id);setError("")}}>Enter dispatch</button>:<button key={status} type="button" disabled={busy===o.id} className={status==="cancelled"?"nx-danger-action":"nx-cod-action"} onClick={()=>status==="cancelled"?openDialog("cancel-cod",o,status):status==="delivered"?openDialog("delivered",o,status):setStatus(o,status)}>{status==="cancelled"?"Cancel order":labels[status]||status}</button>)}
     {['confirmed','processing','shipped'].includes(o.status)&&o.cancellationRequest?.status!=='pending'&&(o.paymentMethod!=='Razorpay'||o.paymentStatus==='razorpay_paid')&&<button type="button" className="nx53-orders-link" disabled={!!busy||assignmentLoading} onClick={()=>openAssignmentPicker(o)}>Choose delivery executive <UiIcon name="users" size={16}/></button>}
     {o.status==="delivered"&&o.paymentMethod!=="Razorpay"&&o.paymentStatus!=="cod_collected"&&<button type="button" className="nx38-collect-action" disabled={busy===o.id} onClick={()=>openDialog("collect",o)}>Record cash received</button>}
   </div></footer>
 </article></div></div></Modal>)}
 {assignmentOrder&&<DeliveryExecutivePicker key={assignmentOrder.id} order={assignmentOrder} current={existingAssignment} staff={assignmentData.staff} assignments={assignmentData.assignments} busy={assignmentLoading||!!busy} error={assignmentError} onAssign={submitAssignment} onClose={closeAssignmentPicker}/>}
 {dialog&&<OrderActionDialog key={`${dialog.type}-${dialog.order.id}`} dialog={dialog} busy={String(busy)===String(dialog.order.id)} error={dialogError} refundConfig={refundConfig} onClose={closeDialog} onConfirm={confirmDialog}/>}
 </>;
}
