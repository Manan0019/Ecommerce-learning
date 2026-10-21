import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import OrderTimeline from "../../components/customer/OrderTimeline";
import { getAdminOrders, updateCodStatus, confirmCodCollection, expireUnpaidRazorpayOrder } from "../../services/orderService";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const nextStatuses={placed:["confirmed","cancelled"],confirmed:["processing","cancelled"],processing:["shipped"],shipped:["delivered"],delivered:[],cancelled:[]};
const labels={confirmed:"Confirm order",processing:"Mark preparing",delivered:"Mark delivered"};

export default function AdminOrders(){
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(""),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const [dispatchId,setDispatchId]=useState(null),[partner,setPartner]=useState(""),[tracking,setTracking]=useState("");
 useEffect(()=>{const c=new AbortController();getAdminOrders(c.signal).then(d=>setOrders(d.orders||[])).catch(e=>{if(e.name!=="AbortError")setError(e.message)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort();},[]);
 async function refreshOrders(){const result=await getAdminOrders();setOrders(result.orders||[]);}
 async function setStatus(order,status){
  if(status==="cancelled"&&order.paymentMethod==="Razorpay"){setError("Paid Razorpay orders cannot be cancelled here until their refund is reconciled.");return;}
  if(status==="cancelled"&&!window.confirm(`Cancel order #${order.id}? Stock will be restored. This cannot be undone.`))return;
  if(status==="delivered"&&!window.confirm(`Confirm order #${order.id} was delivered? This is a manual status update.`))return;
  if(status==="shipped"&&!partner.trim()){setError("Enter a delivery partner before dispatching the order.");return;}
  setBusy(order.id);setError("");try{
   await updateCodStatus(order.id,status,status==="shipped"?{deliveryPartner:partner,trackingReference:tracking}:{});
   await refreshOrders();setDispatchId(null);setPartner("");setTracking("");window.dispatchEvent(new Event("nexora:inventory-updated"));
  }catch(e){setError(e.message)}finally{setBusy("")}
 }
 async function expirePayment(order){
  if(!window.confirm(`Check Razorpay and expire unpaid reservation for #${order.id}? This is only allowed after 60 minutes, and cannot be undone.`))return;
  setBusy(order.id);setError('');try{await expireUnpaidRazorpayOrder(order.id);await refreshOrders();window.dispatchEvent(new Event('nexora:inventory-updated'));}catch(e){setError(e.message)}finally{setBusy('')}
 }
 async function collectCash(order){
  if(!window.confirm(`Record that the full COD amount ${money(order.total)} was received for order #${order.id}? This is a manual acknowledgement.`))return;
  setBusy(order.id);setError("");try{await confirmCodCollection(order.id);await refreshOrders();}catch(e){setError(e.message)}finally{setBusy("")}
 }
 const totals=useMemo(()=>({placed:orders.filter(o=>o.status==="placed").length,progress:orders.filter(o=>["confirmed","processing","shipped"].includes(o.status)).length,delivered:orders.filter(o=>o.status==="delivered").length,orderValue:orders.filter(o=>!['cancelled','payment_pending','payment_expired','payment_review'].includes(o.status)).reduce((a,o)=>a+Number(o.total),0)}),[orders]);
 const visible=orders.filter(o=>(filter==="all"||filter===o.status)&&`${o.id} ${o.customerName} ${o.customerEmail}`.toLowerCase().includes(search.toLowerCase()));
 return <AdminLayout title="Orders & fulfillment" subtitle="Track COD and Razorpay payments, then process verified orders for dispatch and delivery.">
 {error&&<div className="admin-alert" role="alert">{error}</div>}
 <div className="nx-admin-summary nx-cod-admin-stats"><div><small>Orders loaded</small><strong>{orders.length}</strong></div><div><small>Awaiting review</small><strong>{totals.placed}</strong></div><div><small>In progress</small><strong>{totals.progress}</strong></div><div><small>Delivered</small><strong>{totals.delivered}</strong></div></div>
 <section className="admin-panel nx-admin-orders-panel"><div className="admin-panel-heading"><div><h2>Order queue</h2><p>COD and Razorpay orders. Online payment must be captured before fulfillment; COD collection is recorded manually.</p><small>Non-cancelled order value: {money(totals.orderValue)}</small></div></div>
 <div className="nx-cod-toolbar"><label><span className="sr-only">Search orders</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by order, customer or email" type="search"/></label><label>Status <select value={filter} onChange={e=>setFilter(e.target.value)}>{["all","placed","confirmed","processing","shipped","delivered","cancelled","payment_pending","payment_review","payment_expired"].map(s=><option value={s} key={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select></label></div>
 {loading?<p role="status" className="nx-cod-padding">Loading orders…</p>:!visible.length?<p className="nx-cod-padding">No orders match this view.</p>:<div className="nx-admin-orders-grid">{visible.map(o=><article className="nx-admin-order-card" key={o.id}>
   <header><div><strong>Order #{o.id}</strong><small>{new Date(o.placedAt).toLocaleString("en-IN")}</small></div><span className={`nx-status nx-status-${o.status}`}>{o.status}</span></header>
   <div className="nx-admin-order-meta"><div><strong>{o.customerName||"Customer"}</strong><span>{o.customerEmail||""}</span></div><div className="nx34-order-total"><small>{o.paymentMethod==="Razorpay"?"Online total":"COD total"}</small><strong>{money(o.total)}</strong></div></div>
   <div className="nx-admin-order-items">{o.items.map((item,i)=><div className="nx34-admin-order-line" key={`${item.productId}-${item.variantId||"base"}-${i}`}><div className="nx34-order-line-info"><strong>{item.name}</strong>{item.sku&&<small>SKU: {item.sku}</small>}</div><div className="nx34-order-line-numbers"><span className="nx34-order-quantity">Qty {item.quantity}</span><strong>{money(item.lineTotal??Number(item.unitPrice||0)*Number(item.quantity||0))}</strong></div></div>)}</div>
   <div className="nx25-order-breakdown"><span><span>Items subtotal</span><strong>{money(o.subtotal)}</strong></span><span><span>Shipping</span><strong>{money(o.shippingFee)}</strong></span><span><span>GST included</span><strong>{money(o.taxTotal)}</strong></span></div>
   <OrderTimeline order={o}/>
   <details><summary>Delivery address</summary><p>{o.address.fullName}, {o.address.phone}</p><p>{o.address.addressLine1}, {o.address.addressLine2}</p><p>{o.address.city}, {o.address.state} — {o.address.pincode}</p></details>
   {dispatchId===o.id&&<form className="nx38-dispatch-form" onSubmit={e=>{e.preventDefault();setStatus(o,"shipped")}}><h3>Dispatch details</h3><label>Delivery partner <span aria-hidden="true">*</span><input required maxLength={80} value={partner} onChange={e=>setPartner(e.target.value)} placeholder="e.g. Local delivery or your courier"/></label><label>Tracking reference (optional)<input maxLength={100} value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="Enter courier tracking ID if available"/></label><div><button className="nx-cod-action" type="submit" disabled={busy===o.id}>Confirm dispatch</button><button type="button" className="nx38-neutral-action" onClick={()=>setDispatchId(null)}>Back</button></div></form>}
   <footer><small>{o.paymentMethod==='Razorpay'?(o.paymentStatus==='razorpay_paid'?'✓ Paid via Razorpay':o.paymentStatus==='razorpay_review'?'Payment requires manual review':o.paymentStatus==='razorpay_expired'?'Unpaid reservation expired':'Awaiting payment · stock reserved'):(o.paymentStatus==='cod_collected'?'COD cash collection recorded':'COD · cash collection not recorded')}</small><div>
     {o.status==='payment_pending'&&<button type="button" className="nx38-neutral-action" disabled={busy===o.id} onClick={()=>expirePayment(o)}>Verify & expire after 60 min</button>}
     {(nextStatuses[o.status]||[]).filter(status=>!(o.paymentMethod==='Razorpay'&&status==='cancelled')).map(status=>status==="shipped"?<button key={status} type="button" className="nx-cod-action" disabled={busy===o.id} onClick={()=>{setDispatchId(o.id);setError("")}}>Enter dispatch</button>:<button key={status} type="button" disabled={busy===o.id} className={status==="cancelled"?"nx-danger-action":"nx-cod-action"} onClick={()=>setStatus(o,status)}>{status==="cancelled"?"Cancel order":labels[status]||status}</button>)}
     {o.status==="delivered"&&o.paymentMethod!=="Razorpay"&&o.paymentStatus!=="cod_collected"&&<button type="button" className="nx38-collect-action" disabled={busy===o.id} onClick={()=>collectCash(o)}>Record cash received</button>}
   </div></footer>
 </article>)}</div>}
 </section>
 </AdminLayout>;
}
