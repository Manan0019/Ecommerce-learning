import { Select, DataTable } from "../../components/ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import {useEffect,useMemo,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import UiIcon from '../../components/common/UiIcon';
import {apiRequest} from '../../services/apiClient';
const currency=x=>`₹${Number(x||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const kpis=[['recorded_sales','Recorded sales','indigo'],['cod_collected','COD collected','mint'],['prepaid_captured','Prepaid captured','blue'],['orders','Orders placed','amber']];
export default function AdminAnalytics(){
 const [days,setDays]=useState(30),[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const liveRevision=useRealtimeRevision(['analytics', 'orders', 'finance']);
 useEffect(()=>{const ctrl=new AbortController();setLoading(true);setError('');
  apiRequest(`/api/admin/analytics/overview?days=${days}`,{credentials:'include',signal:ctrl.signal})
   .then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!ctrl.signal.aborted)setLoading(false)});
  return()=>ctrl.abort();},[days,liveRevision]);
 const rows=data?.daily||[],highest=useMemo(()=>Math.max(1,...rows.map(r=>Number(r.collected||0))),[rows]);
 return <AdminLayout><div className="nx82-analytics"><header className="nx82-analytics-header"><div><small>ADMIN WORKSPACE / INSIGHTS</small><h1>Store analytics</h1><p>Verified collections and order activity, sourced from the database.</p></div>
  <label>Reporting period<Select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select></label></header>
  {error&&<div role="alert" className="nx82-analytics-error">{error}</div>}
  {loading?<div className="nx82-analytics-panel" role="status">Loading financial activity…</div>:data&&<>
   <div className="nx82-analytics-kpis">{kpis.map(([key,title,tone])=><article key={key} className={`nx82-analytics-kpi is-${tone}`}><span>{title}</span><strong>{key==='orders'?data.overview[key]:currency(data.overview[key])}</strong><small>{key==='recorded_sales'?'Captured online payments and recorded COD':'Based on the selected period'}</small></article>)}</div>
   <div className="nx82-analytics-grid"><section className="nx82-analytics-panel"><div className="nx82-analytics-panel-head"><div><p>COLLECTION TREND</p><h2>Paid order value by day</h2></div><span><UiIcon name="bar-chart" size={18}/> {days} days</span></div>
    {rows.length?<div className="nx82-analytics-bars" role="list" aria-label="Daily recorded collections">{rows.map(item=><div className="nx82-analytics-bar" key={item.day} role="listitem" title={`${item.day}: ${currency(item.collected)}`}><div style={{height:`${Math.max(Number(item.collected)>0?5:2,Number(item.collected)/highest*100)}%`}}/><small>{item.day.slice(5)}</small></div>)}</div>:<p>No collections have been recorded in this period.</p>}
   </section><section className="nx82-analytics-panel"><div className="nx82-analytics-panel-head"><div><p>FULFILLMENT HEALTH</p><h2>Order progress</h2></div></div><div className="nx82-analytics-progress"><div><span>Delivered</span><strong>{data.overview.delivered}</strong></div><div><span>In fulfillment</span><strong>{data.overview.active}</strong></div><div><span>Paid online</span><strong>{data.overview.prepaid_paid}</strong></div><div><span>COD paid</span><strong>{data.overview.cod_paid}</strong></div></div></section></div>
   <section className="nx82-analytics-panel"><div className="nx82-analytics-panel-head"><div><p>PRODUCT PERFORMANCE</p><h2>Most purchased products</h2></div></div><div className="nx82-analytics-table"><DataTable><thead><tr><th>Product</th><th>Units</th><th>Recorded line value</th></tr></thead><tbody>{(data.products||[]).length?(data.products||[]).map(item=><tr key={`${item.product_id}:${item.name}`}><td>{item.name}</td><td>{item.units}</td><td>{currency(item.line_value)}</td></tr>):<tr><td colSpan={3}>No paid products for this period.</td></tr>}</tbody></DataTable></div></section>
   <p className="nx82-analytics-footnote">Recorded sales are not profit, bank settlement, GST liability or a comprehensive financial statement. Refunds, platform fees, operating costs and accruals require separate reconciliation.</p>
  </>}
 </div></AdminLayout>;
}
