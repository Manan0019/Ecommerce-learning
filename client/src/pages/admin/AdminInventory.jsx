import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import {useEffect,useState} from 'react';
import UiIcon from "../../components/common/UiIcon";
import {Link} from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import AdminProductEditDialog from '../../components/admin/AdminProductEditDialog';
import {getLowStockAlerts} from '../../services/inventoryService';
export default function AdminInventory(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const liveRevision=useRealtimeRevision(['inventory', 'catalog']);
  const [editor,setEditor]=useState(null);
  const [query,setQuery]=useState(''),[state,setState]=useState('all'),[page,setPage]=useState(1);
  async function reload(){setError('');setLoading(true);try{setData(await getLowStockAlerts(500));}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{let active=true;getLowStockAlerts(500).then(r=>{if(active)setData(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[liveRevision]);
  const visible=(data?.items||[]).filter(item=>`${item.productName||''} ${item.sku||''} ${Object.values(item.attributes||{}).join(' ')}`.toLowerCase().includes(query.toLowerCase())&&(state==='all'||(state==='out'&&Number(item.available)===0)||(state==='low'&&Number(item.available)>0)));
  const pages=Math.max(1,Math.ceil(visible.length/15)),slice=visible.slice((Math.min(page,pages)-1)*15,Math.min(page,pages)*15);
  return <AdminLayout title="Inventory Alerts" subtitle="Low-stock and out-of-stock products and SKUs, based on your own alert thresholds."
    actions={<button type="button" className="admin-secondary-action" onClick={reload}>Refresh stock</button>}>
    {error&&<p className="admin-alert" role="alert">{error}</p>}
    <section className="nx24-alert-summary" aria-label="Inventory alert totals">
      <div><span>Needs attention</span><strong>{data?.summary.total??'—'}</strong></div>
      <div><span>Out of stock</span><strong>{data?.summary.outOfStock??'—'}</strong></div>
      <div><span>Low stock</span><strong>{data?.summary.lowStock??'—'}</strong></div>
    </section>
    <section className="admin-panel nx24-inventory-panel"><div className="admin-panel-heading"><div><h2>Stock alerts</h2><p>SKUs alert independently. Inactive products and SKUs are excluded. Stock changes after COD orders or cancellation appear after refresh.</p></div></div>
      <div className="nx77-table-toolbar"><label className="nx77-search-field"><UiIcon name="search" size={17}/><input type="search" placeholder="Search product, SKU or variant" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><label className="nx77-filter-label">Stock<select value={state} onChange={e=>{setState(e.target.value);setPage(1);}}><option value="all">All alerts</option><option value="out">Out of stock</option><option value="low">Low stock</option></select></label><strong>{visible.length} matches</strong><button type="button" className="nx84-admin-reset nx84-inventory-reset" onClick={()=>{setQuery('');setState('all');setPage(1);}} disabled={!query&&state==='all'}><UiIcon name="refresh-cw" size={15}/><span className="nx84-reset-label">Reset filters</span></button></div>
      {loading?<p>Loading stock alerts…</p>:data?.items.length===0?<p className="nx24-no-alerts">No active products or SKUs are at or below their low-stock thresholds.</p>:
      <div className="admin-table-wrap nx84-inventory-scroll" role="region" aria-label="Inventory stock alerts" tabIndex={0}><table className="admin-table nx84-inventory-table"><colgroup><col className="nx84-col-product"/><col className="nx84-col-available"/><col className="nx84-col-threshold"/><col className="nx84-col-status"/><col className="nx84-col-action"/></colgroup><thead><tr><th>Product / SKU</th><th>Available</th><th>Alert at</th><th>State</th><th>Action</th></tr></thead><tbody>
        {slice.map((item,index)=><tr key={`${item.productId}:${item.variantId||'simple'}:${index}`}>
          <td className="nx84-inventory-product-cell"><div className="nx84-inventory-product"><Link className="nx46-product-title" title={item.productName} to={`/admin/products/${item.productId}/preview`} state={{from:"/admin/inventory"}}>{item.productName}</Link><small title={`${item.sku?`SKU: ${item.sku}`:'Simple product'}${item.attributes&&Object.keys(item.attributes).length?` · ${Object.values(item.attributes).join(' / ')}`:''}`}>{item.sku?`SKU: ${item.sku}`:'Simple product'}{item.attributes&&Object.keys(item.attributes).length?` · ${Object.values(item.attributes).join(' / ')}`:''}</small></div></td>
          <td><strong className={`nx84-inventory-number ${Number(item.available)===0?'is-out':'is-low'}`}>{item.available}</strong></td><td><span className="nx84-inventory-threshold">{item.threshold}</span></td><td><span className={Number(item.available)===0?'nx24-out':'nx24-low'}>{Number(item.available)===0?'Out of stock':'Low stock'}</span></td>
          <td><button className="nx50-inventory-edit" type="button"
            onClick={() => setEditor({id:item.productId,name:item.productName,tab:item.variantId?'variants':'details'})}>
            Update stock <UiIcon name="edit" size={17}/></button></td>
        </tr>)}</tbody></table></div>}
      <div className="nx77-pagination"><span>Page {Math.min(page,pages)} of {pages}</span><button type="button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><button type="button" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button></div>
      {(data?.summary.total||0)>500&&<p>Showing the first 500 alerts. More inventory requires attention.</p>}
    </section>
    {editor&&<AdminProductEditDialog productId={editor.id} name={editor.name} initialTab={editor.tab}
      onClose={() => { setEditor(null); reload(); }} onSaved={() => reload()}/>}
  </AdminLayout>;
}
