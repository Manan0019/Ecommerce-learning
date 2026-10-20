import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import OrderTimeline from "../../components/customer/OrderTimeline";
import { getMyOrders } from "../../services/orderService";
import { isAuthenticationError } from "../../services/apiClient";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function Orders(){
 const navigate=useNavigate(),location=useLocation();
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();getMyOrders(controller.signal).then(d=>setOrders(d.orders||[])).catch(e=>{if(isAuthenticationError(e))navigate("/login",{replace:true,state:{from:"/orders"}});else if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[navigate]);
 return <CustomerLayout mainClassName="nx-orders-page"><div className="nx-page-intro"><p className="eyebrow">Your orders</p><h1>Follow every order</h1><p>See each step from confirmation to delivery. Pay on delivery; no online payments are processed.</p></div>
 {location.state?.placedId&&<div className="nx-cod-message nx-cod-success" role="status">✓ Order #{location.state.placedId} {location.state.alreadyPlaced?"was already placed":"was placed successfully"}. Pay on delivery.</div>}
 {loading?<p role="status">Loading orders…</p>:error?<div className="nx-cod-message nx-cod-error" role="alert">{error}</div>:!orders.length?<div className="store-empty"><h2>No orders yet</h2><p>When you order, you can follow its progress here.</p><Link className="button button-primary" to="/products">Explore products</Link></div>:<div className="nx-orders-list">{orders.map(o=><article className="nx-order-card nx38-customer-order" key={o.id}>
   <div className="nx-order-heading"><div><small>Order #{o.id} · {new Date(o.placedAt).toLocaleDateString("en-IN")}</small><h2>{money(o.total)} <span className="nx38-item-count">· {o.items.length} item{o.items.length===1?"":"s"}</span></h2></div><span className={`nx-status nx-status-${o.status}`}>{o.status}</span></div>
   <OrderTimeline order={o}/>
   <div className="nx-order-items">{o.items.map((item,i)=><div className="nx-order-product" key={`${item.productId}-${item.variantId||"base"}-${i}`}><div><strong>{item.name}</strong><small>{item.sku||"Standard"} · Qty {item.quantity}</small></div><span>{money(item.lineTotal)}</span></div>)}</div>
   <div className="nx25-order-breakdown nx38-order-breakdown"><span><span>Items</span><strong>{money(o.subtotal)}</strong></span><span><span>Shipping</span><strong>{money(o.shippingFee)}</strong></span><span><span>Included GST</span><strong>{money(o.taxTotal)}</strong></span><span><span>Amount due on delivery</span><strong>{money(o.total)}</strong></span></div>
   <div className="nx-order-footer"><span>Cash on Delivery · {o.paymentStatus === "cod_collected" ? "Collection recorded" : "Not paid online"}</span><span>{o.address?.city}, {o.address?.state}</span></div>
 </article>)}</div>}
 </CustomerLayout>;
}
