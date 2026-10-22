import {useEffect,useState} from 'react';
import UiIcon from "../../components/common/UiIcon";
import {Link} from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import AdminProductEditDialog from '../../components/admin/AdminProductEditDialog';
import {getLowStockAlerts} from '../../services/inventoryService';
export default function AdminInventory(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [editor,setEditor]=useState(null);
  async function reload(){setError('');setLoading(true);try{setData(await getLowStockAlerts(500));}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{let active=true;getLowStockAlerts(500).then(r=>{if(active)setData(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  return <AdminLayout title="Inventory Alerts" subtitle="Low-stock and out-of-stock products and SKUs, based on your own alert thresholds."
    actions={<button type="button" className="admin-secondary-action" onClick={reload}>Refresh stock</button>}>
    {error&&<p className="admin-alert" role="alert">{error}</p>}
    <section className="nx24-alert-summary" aria-label="Inventory alert totals">
      <div><span>Needs attention</span><strong>{data?.summary.total??'—'}</strong></div>
      <div><span>Out of stock</span><strong>{data?.summary.outOfStock??'—'}</strong></div>
      <div><span>Low stock</span><strong>{data?.summary.lowStock??'—'}</strong></div>
    </section>
    <section className="admin-panel nx24-inventory-panel"><div className="admin-panel-heading"><div><h2>Stock alerts</h2><p>SKUs alert independently. Inactive products and SKUs are excluded. Stock changes after COD orders or cancellation appear after refresh.</p></div></div>
      {loading?<p>Loading stock alerts…</p>:data?.items.length===0?<p className="nx24-no-alerts">No active products or SKUs are at or below their low-stock thresholds.</p>:
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product / SKU</th><th>Available</th><th>Alert at</th><th>State</th><th>Action</th></tr></thead><tbody>
        {data?.items.map((item,index)=><tr key={`${item.productId}:${item.variantId||'simple'}:${index}`}>
          <td><Link className="nx46-product-title" to={`/admin/products/${item.productId}/preview`} state={{from:"/admin/inventory"}}>{item.productName}</Link><small>{item.sku?`SKU: ${item.sku}`:'Simple product'}{item.attributes&&Object.keys(item.attributes).length?` · ${Object.values(item.attributes).join(' / ')}`:''}</small></td>
          <td>{item.available}</td><td>{item.threshold}</td><td><span className={item.available===0?'nx24-out':'nx24-low'}>{item.available===0?'Out of stock':'Low stock'}</span></td>
          <td><button className="nx50-inventory-edit" type="button"
            onClick={() => setEditor({id:item.productId,name:item.productName,tab:item.variantId?'variants':'details'})}>
            Update stock <UiIcon name="edit" size={17}/></button></td>
        </tr>)}</tbody></table></div>}
      {(data?.summary.total||0)>500&&<p>Showing the first 500 alerts. More inventory requires attention.</p>}
    </section>
    {editor&&<AdminProductEditDialog productId={editor.id} name={editor.name} initialTab={editor.tab}
      onClose={() => { setEditor(null); reload(); }} onSaved={() => reload()}/>}
  </AdminLayout>;
}
