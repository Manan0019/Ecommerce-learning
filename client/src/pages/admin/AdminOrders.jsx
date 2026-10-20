import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import { getAdminOrders, updateCodStatus } from "../../services/orderService";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const nextStatuses={placed:["confirmed","cancelled"],confirmed:["processing","cancelled"],processing:[],cancelled:[]};
export default function AdminOrders(){
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(""),[filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 useEffect(()=>{const c=new AbortController();getAdminOrders(c.signal).then(d=>setOrders(d.orders||[])).catch(e=>{if(e.name!=="AbortError")setError(e.message)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort();},[]);
 async function setStatus(order,status){
  if(status==="cancelled"&&!window.confirm(`Cancel order #${order.id}? This will restore stock and cannot be undone.`))return;
  setBusy(order.id);setError("");try{const result=await updateCodStatus(order.id,status);setOrders(old=>old.map(o=>o.id===order.id?{...o,status:result.order.status}:o)); window.dispatchEvent(new Event("nexora:inventory-updated"));}catch(e){setError(e.message)}finally{setBusy("")}
 }
 const totals=useMemo(()=>({placed:orders.filter(o=>o.status==="placed").length,processing:orders.filter(o=>["confirmed","processing"].includes(o.status)).length,orderValue:orders.filter(o=>o.status!=="cancelled").reduce((a,o)=>a+Number(o.total),0)}),[orders]);
 const visible=orders.filter(o=>(filter==="all"||filter===o.status)&&`${o.id} ${o.customerName} ${o.customerEmail}`.toLowerCase().includes(search.toLowerCase()));
 return <AdminLayout title="COD orders" subtitle="Review confirmed customer orders and manage processing without any online payment integration.">
 {error&&<div className="admin-alert" role="alert">{error}</div>}
 <div className="nx-admin-summary nx-cod-admin-stats"><div><small>Orders loaded</small><strong>{orders.length}</strong></div><div><small>Awaiting review</small><strong>{totals.placed}</strong></div><div><small>Confirmed / processing</small><strong>{totals.processing}</strong></div><div><small>Non-cancelled order value</small><strong>{money(totals.orderValue)}</strong></div></div>
 <section className="admin-panel nx-admin-orders-panel"><div className="admin-panel-heading"><div><h2>Order queue</h2><p>Only manually placed Cash on Delivery orders appear here.</p></div></div>
 <div className="nx-cod-toolbar"><label><span className="sr-only">Search orders</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by order, customer or email" type="search"/></label><label>Status <select value={filter} onChange={e=>setFilter(e.target.value)}>{["all","placed","confirmed","processing","cancelled"].map(s=><option value={s} key={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select></label></div>
 {loading?<p role="status" className="nx-cod-padding">Loading orders…</p>:!visible.length?<p className="nx-cod-padding">No orders match this view.</p>:<div className="nx-admin-orders-grid">{visible.map(o=><article className="nx-admin-order-card" key={o.id}>
 <header><div><strong>Order #{o.id}</strong><small>{new Date(o.placedAt).toLocaleString("en-IN")}</small></div><span className={`nx-status nx-status-${o.status}`}>{o.status}</span></header>
 <div className="nx-admin-order-meta"><div><strong>{o.customerName||"Customer"}</strong><span>{o.customerEmail||""}</span></div><div className="nx34-order-total"><small>COD total</small><strong>{money(o.total)}</strong></div></div>
 <div className="nx-admin-order-items">{o.items.map((item,i)=><div className="nx34-admin-order-line" key={item.id || `${item.productId}-${item.variantId || "simple"}-${i}`}>
   <div className="nx34-order-line-info"><strong>{item.name}</strong>{item.sku&&<small>SKU: {item.sku}</small>}</div>
   <div className="nx34-order-line-numbers"><span className="nx34-order-quantity">Qty {item.quantity}</span><strong>{money(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))}</strong></div>
 </div>)}</div>
 <div className="nx25-order-breakdown"><span><span>Products subtotal</span><strong>{money(o.subtotal)}</strong></span><span><span>Shipping</span><strong>{money(o.shippingFee)}</strong></span><span><span>GST included</span><strong>{money(o.taxTotal)}</strong></span></div><details><summary>Delivery details</summary><p>{o.address.fullName}, {o.address.phone}</p><p>{o.address.addressLine1}, {o.address.addressLine2}</p><p>{o.address.city}, {o.address.state} — {o.address.pincode}</p></details>
 <footer><small>COD · unpaid online</small><div>{(nextStatuses[o.status]||[]).map(status=><button key={status} type="button" disabled={busy===o.id} className={status==="cancelled"?"nx-danger-action":"nx-cod-action"} onClick={()=>setStatus(o,status)}>{status==="cancelled"?"Cancel order":status==="confirmed"?"Confirm order":"Mark processing"}</button>)}</div></footer>
 </article>)}</div>}
 </section>
 </AdminLayout>;
}
