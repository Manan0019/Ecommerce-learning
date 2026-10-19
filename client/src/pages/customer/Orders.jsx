import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getMyOrders } from "../../services/orderService";
import { isAuthenticationError } from "../../services/apiClient";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function Orders(){
 const navigate=useNavigate(),location=useLocation();
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();getMyOrders(controller.signal).then(d=>setOrders(d.orders||[])).catch(e=>{if(isAuthenticationError(e))navigate("/login",{replace:true,state:{from:"/orders"}});else if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[navigate]);
 return <CustomerLayout mainClassName="nx-orders-page"><div className="nx-page-intro"><p className="eyebrow">My account</p><h1>My orders</h1><p>Track your Cash on Delivery orders. Online payments are not enabled.</p></div>
 {location.state?.placedId&&<div className="nx-cod-message nx-cod-success" role="status">✓ Order #{location.state.placedId} {location.state.alreadyPlaced?"was already placed":"was placed successfully"}. Pay on delivery.</div>}
 {loading?<p role="status">Loading orders…</p>:error?<div className="nx-cod-message nx-cod-error" role="alert">{error}</div>:!orders.length?<div className="store-empty"><h2>No orders yet</h2><p>Your recent orders will appear here.</p><Link className="button button-primary" to="/products">Explore products</Link></div>:<div className="nx-orders-list">{orders.map(o=><article className="nx-order-card" key={o.id}><div className="nx-order-heading"><div><small>Order #{o.id} · {new Date(o.placedAt).toLocaleDateString("en-IN")}</small><h2>{o.items.length} item{ o.items.length===1?"":"s"} · {money(o.total)}</h2></div><span className={`nx-status nx-status-${o.status}`}>{o.status}</span></div><div className="nx-order-items">{o.items.map((item,i)=><div className="nx-order-product" key={i}><div><strong>{item.name}</strong><small>{item.sku||"Standard"} · Qty {item.quantity}</small></div><span>{money(item.lineTotal)}</span></div>)}</div><div className="nx-order-footer"><span>Cash on Delivery · {o.status==="cancelled"?"Cancelled":"Not paid online"}</span><span>{o.address?.city}, {o.address?.state}</span></div></article>)}</div>}
 </CustomerLayout>;
}
