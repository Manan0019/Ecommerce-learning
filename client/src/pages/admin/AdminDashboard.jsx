import { DataTable, EmptyState } from "../../components/ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import {useEffect,useMemo,useState} from 'react';
import UiIcon from "../../components/common/UiIcon";
import AdminOrders from './AdminOrders';
import {Link,useNavigate} from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiAssetUrl,isAuthenticationError} from '../../services/apiClient';
import {getAdminSummary} from '../../services/adminService';
import {getAdminProducts} from '../../services/productService';
import {getAdminOrders} from '../../services/orderService';
import {getLowStockAlerts} from '../../services/inventoryService';
import {getAdminAssignments} from '../../services/deliveryService';
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2})}`;
const date=v=>new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
export default function AdminDashboard(){
 const navigate=useNavigate();
 const liveRevision=useRealtimeRevision(['orders', 'inventory', 'catalog', 'delivery', 'finance', 'analytics']);const [openDashboardOrder,setOpenDashboardOrder]=useState(null);const [summary,setSummary]=useState(null),[products,setProducts]=useState([]),[orders,setOrders]=useState([]),[alerts,setAlerts]=useState(null),[assignments,setAssignments]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[serviceIssues,setServiceIssues]=useState([]),[revision,setRevision]=useState(0);
 useEffect(()=>{const c=new AbortController();Promise.allSettled([
  getAdminSummary(c.signal),getAdminProducts(c.signal),getAdminOrders(c.signal),getLowStockAlerts(5,c.signal),getAdminAssignments(c.signal)
 ]).then(results=>{if(c.signal.aborted)return;
  const [s,p,o,a,d]=results;
  if(s.status==='fulfilled')setSummary(s.value.summary);
  if(p.status==='fulfilled')setProducts(p.value.products||[]);
  if(o.status==='fulfilled')setOrders(o.value.orders||[]);
  if(a.status==='fulfilled')setAlerts(a.value);
  if(d.status==='fulfilled')setAssignments(d.value.assignments||[]);
  const denied=results.find(x=>x.status==='rejected'&&isAuthenticationError(x.reason));
  if(denied){navigate('/login',{replace:true});return;}
  const labels=['Store summary','Products','Orders','Inventory alerts','Delivery assignments'];
  const issues=results.flatMap((x,i)=>x.status==='rejected'&&x.reason?.name!=='AbortError'?[{label:labels[i],status:x.reason?.status,message:x.reason?.message||'Request failed'}]:[]);
  setServiceIssues(issues);
  setError(issues.filter(x=>x.label!=='Delivery assignments').length?'Some store metrics are unavailable. See the services below for details.':'');
 }).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[navigate,revision,liveRevision]);
 const insights=useMemo(()=>{
  const active=orders.filter(o=>!['cancelled','payment_expired'].includes(o.status));
  const paid=orders.filter(o=>o.paymentStatus==='razorpay_paid'||o.paymentStatus==='cod_collected');
  return {total:orders.length,paidValue:paid.reduce((n,o)=>n+Number(o.total||0),0),awaiting:orders.filter(o=>['placed','payment_review','refund_review'].includes(o.status)||o.cancellationRequest?.status==='pending').length,
  fulfillment:active.filter(o=>['confirmed','processing','shipped'].includes(o.status)).length,paidCount:paid.length,
  cod:active.filter(o=>o.paymentMethod==='Cash on Delivery').length,online:active.filter(o=>o.paymentMethod==='Razorpay').length,refunds:orders.filter(o=>['refund_pending','refund_review'].includes(o.status)).length,
  delivery:assignments.filter(a=>a.deliveryStatus==='out_for_delivery').length};
 },[orders,assignments]);
 return <AdminLayout title="Store overview" subtitle="Orders, revenue, inventory and fulfillment in one workspace." actions={<Link className="admin-primary-action" to="/admin/products/new">+ Add product</Link>}>
  {serviceIssues.length>0&&<section className="nx51-dashboard-notice" aria-label="Dashboard service health">
    <div><strong>{serviceIssues.some(i=>i.label!=='Delivery assignments')?'Some dashboard sections are unavailable':'Delivery metrics are temporarily unavailable'}</strong>
    <p>{serviceIssues.map(i=>`${i.label}${i.status===404?' (API route missing)':''}`).join(' · ')}</p>
    {serviceIssues.some(i=>i.label==='Delivery assignments'&&i.status===404)&&<small>Update the Phase 46/51 delivery backend, run migration 028 and restart Express. Other dashboard data remains available.</small>}
    </div><button type="button" onClick={()=>{setLoading(true);setRevision(x=>x+1);}}>Retry data</button>
  </section>}
  {error&&!serviceIssues.length&&<p className="admin-alert" role="alert">{error}</p>}
  <section className="nx46-dashboard-welcome"><div><p className="admin-eyebrow">NEXORA · OPERATIONS</p><h2>Your business at a glance</h2><p>Live database metrics from the most recent 200 orders and 100 products returned by the admin API.</p></div><div className="nx46-welcome-actions"><Link to="/admin/orders">Review orders <UiIcon name="right" size={17}/></Link><Link to="/admin/delivery">Delivery operations <UiIcon name="right" size={17}/></Link></div></section>
  <section className="nx46-metrics nx46-dashboard-metrics" aria-label="Store performance">
   {[
    {label:'Total orders',value:loading?'—':insights.total,detail:'Recent 200 orders',to:'/admin/orders',icon:'▤'},
    {label:'Recorded collected / paid',value:loading?'—':money(insights.paidValue),detail:`${insights.paidCount} verified paid orders`,to:'/admin/orders',icon:'₹'},
    {label:'Needs attention',value:loading?'—':insights.awaiting,detail:'New orders / reviews',to:'/admin/orders',icon:'!'},
    {label:'In fulfillment',value:loading?'—':insights.fulfillment,detail:`${insights.delivery} out for delivery`,to:'/admin/delivery',icon:'delivery'}
   ].map(m=><Link className="nx46-metric-link" key={m.label} to={m.to}><article><span>{m.label}</span><strong>{m.value}</strong><small>{m.detail}</small><b aria-hidden="true">{m.icon==='delivery'?<UiIcon name="truck" size={17}/>:m.icon}</b></article></Link>)}
  </section>
  <div className="nx46-dashboard-two">
   <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Recent orders</h2><p>Select any order to manage it here, without leaving the dashboard.</p></div><Link to="/admin/orders">View all <UiIcon name="right" size={17}/></Link></div>
    {!orders.length?<EmptyState icon="bag" title="No orders yet" description="Your latest orders will appear here."/>:<div className="nx46-table-wrap"><DataTable className="nx46-table"><thead><tr><th>Order / customer</th><th>Date</th><th>Amount</th><th>State</th></tr></thead><tbody>{orders.slice(0,10).map(o=><tr key={o.id} className="nx67-order-table-row" onClick={()=>setOpenDashboardOrder(o.id)}  title={`Manage order #${o.id}`}><td><button type="button" className="nx67-dashboard-order-open" onClick={event=>{event.stopPropagation();setOpenDashboardOrder(o.id);}} aria-label={`Manage order ${o.id}`}>#{o.id}</button><br/><small>{o.customerName||'Customer'}</small></td><td>{date(o.placedAt)}</td><td><strong>{money(o.total)}</strong></td><td><span className={`nx46-pill ${o.status==='delivered'?'good':o.status.includes('review')?'warning':''}`}>{o.status.replaceAll('_',' ')}</span></td></tr>)}</tbody></DataTable></div>}
   </section>
   <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Order mix</h2><p>At a glance across the recent order queue.</p></div></div>
    <div className="nx46-dashboard-bar"><span>COD orders</span><strong>{insights.cod}</strong><div className="nx46-bar-track"><i style={{width:`${Math.min(100,insights.cod/Math.max(1,insights.cod+insights.online)*100)}%`}}/></div></div>
    <div className="nx46-dashboard-bar"><span>Prepaid orders</span><strong>{insights.online}</strong><div className="nx46-bar-track"><i style={{width:`${Math.min(100,insights.online/Math.max(1,insights.cod+insights.online)*100)}%`}}/></div></div>
    <div className="nx46-dashboard-priorities"><div><span>Open refund reviews</span><strong>{insights.refunds}</strong></div><div><span>Low-stock alerts</span><strong>{alerts?.summary?.total??'—'}</strong></div><div><span>Active products</span><strong>{summary?.activeProductCount??'—'}</strong></div><div><span>Customers</span><strong>{summary?.customerCount??'—'}</strong></div></div>
    <Link className="nx46-panel-link" to="/admin/inventory">Inventory alerts <UiIcon name="right" size={17}/></Link>
   </section>
  </div>
  <div className="nx46-dashboard-two">
   <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Recently added products</h2><p>Click a product to open its preview.</p></div><Link className="nx78-panel-link" to="/admin/products"><span>Manage products</span><UiIcon name="right" size={17}/></Link></div>
    {!products.length?<EmptyState icon="package" title="No products yet" description="Add products to begin building your catalogue."/>:<div className="nx46-recent-products">{products.slice(0,5).map(p=><Link to={`/admin/products/${p.id}/preview`} state={{from:"/admin/dashboard"}} key={p.id}><div className="nx46-recent-thumb">{p.imageUrl&&<img src={apiAssetUrl(p.imageUrl)} alt=""/>}</div><div><strong>{p.name}</strong><small>{p.category} · {money(p.displayPrice??p.price)}</small></div><UiIcon name="chevron-right" size={17}/></Link>)}</div>}
   </section>
   <section className="admin-panel nx46-panel"><div className="admin-panel-heading"><div><h2>Inventory health</h2><p>Products requiring restocking attention.</p></div><Link to="/admin/inventory">View alerts <UiIcon name="right" size={17}/></Link></div>
    {!alerts?.items?.length?<EmptyState icon="check-circle" title="Stock is healthy" description="No low-stock items require attention."/>:<div className="nx46-recent-products nx71-inventory-health">{alerts.items.slice(0,5).map(item=><Link to={`/admin/products/${item.productId}/preview`} state={{from:"/admin/dashboard"}} key={`${item.productId}-${item.variantId||0}`} title={`View ${item.productName}`}><div className="nx71-stock-detail"><strong>{item.productName}</strong><small title={item.sku||'Standard item'}>{item.sku||'Standard item'}</small></div><span className={`nx71-stock-quantity ${Number(item.available)<=0?'is-out':'is-low'}`}>{item.available} left</span></Link>)}</div>}
   </section>
  </div>
  {openDashboardOrder != null && <AdminOrders embeddedOrderId={openDashboardOrder} onEmbeddedClose={()=>setOpenDashboardOrder(null)} onOrdersChanged={()=>setRevision(value=>value+1)}/>}
 </AdminLayout>;
}
