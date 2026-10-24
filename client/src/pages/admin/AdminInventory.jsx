import usePagination from '../../hooks/usePagination';
import { EntityCell, MetricCard, Button, Card, ClearFilters, DataTable, EmptyState, EntitySubtitle, EntityTitle, FormField, FilterToolbarActions, Pagination, SearchField, Select, StatusBadge, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "../../components/ui/index";

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
  const [query,setQuery]=useState(''),[state,setState]=useState('all');
  async function reload(){setError('');setLoading(true);try{setData(await getLowStockAlerts(500));}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{let active=true;getLowStockAlerts(500).then(r=>{if(active)setData(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[liveRevision]);
  const visible=(data?.items||[]).filter(item=>`${item.productName||''} ${item.sku||''} ${Object.values(item.attributes||{}).join(' ')}`.toLowerCase().includes(query.toLowerCase())&&(state==='all'||(state==='out'&&Number(item.available)===0)||(state==='low'&&Number(item.available)>0)));
  const {page,pages,items:slice,setPage}=usePagination(visible,JSON.stringify([query,state]));
  return <AdminLayout title="Inventory Alerts" subtitle="Low-stock and out-of-stock products and SKUs, based on your own alert thresholds."
    actions={<Button variant="secondary" type="button"  onClick={reload}>Refresh stock</Button>}>
    {error&&<p className="admin-alert" role="alert">{error}</p>}
    <section className="nx24-alert-summary" aria-label="Inventory alert totals">
      <MetricCard as="div" tone="neutral" label={<>Needs attention</>} value={<>{data?.summary.total??'—'}</>}/>
      <MetricCard as="div" tone="neutral" label={<>Out of stock</>} value={<>{data?.summary.outOfStock??'—'}</>}/>
      <MetricCard as="div" tone="neutral" label={<>Low stock</>} value={<>{data?.summary.lowStock??'—'}</>}/>
    </section>
    <Card as="section" className="admin-panel nx24-inventory-panel"><div className="admin-panel-heading"><div><h2>Stock alerts</h2><p>SKUs alert independently. Inactive products and SKUs are excluded. Stock changes after COD orders or cancellation appear after refresh.</p></div></div>
      <div className="nx77-table-toolbar"><SearchField placeholder="Search product, SKU or variant" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/><FormField className="nx77-filter-label">Stock<Select value={state} onChange={e=>{setState(e.target.value);setPage(1);}}><option value="all">All alerts</option><option value="out">Out of stock</option><option value="low">Low stock</option></Select></FormField><FilterToolbarActions><strong className="nx-ui-filter-count">{visible.length} matches</strong><ClearFilters active={Boolean(query)||state!=="all"} label="Clear stock filters" onClear={()=>{setQuery("");setState("all");setPage(1);}}/></FilterToolbarActions></div>
      {loading?<p>Loading stock alerts…</p>:data?.items.length===0?<EmptyState icon="check-circle" title="Stock looks healthy" description="No active SKUs are at or below their alert thresholds."/>:!visible.length?<EmptyState icon="search" title="No matching stock alerts" description="Try a different search or stock filter."/>:
      <TableContainer className="admin-table-wrap nx84-inventory-scroll" role="region" aria-label="Inventory stock alerts" tabIndex={0}><DataTable className="admin-table nx84-inventory-table"><colgroup><col className="nx84-col-product"/><col className="nx84-col-available"/><col className="nx84-col-threshold"/><col className="nx84-col-status"/><col className="nx84-col-action"/></colgroup><TableHead><TableRow><TableHeader>Product / SKU</TableHeader><TableHeader align="end">Available</TableHeader><TableHeader align="end">Alert at</TableHeader><TableHeader>State</TableHeader><TableHeader>Action</TableHeader></TableRow></TableHead><TableBody>
        {slice.map((item,index)=><TableRow key={`${item.productId}:${item.variantId||'simple'}:${index}`}>
          <TableCell className="nx84-inventory-product-cell"><EntityCell className="nx84-inventory-product"><span className="nx84-inventory-product-copy"><EntityTitle as={Link}  title={item.productName} to={`/admin/products/${item.productId}/preview`} state={{from:"/admin/inventory"}}>{item.productName}</EntityTitle><EntitySubtitle title={`${item.sku?`SKU: ${item.sku}`:'Simple product'}${item.attributes&&Object.keys(item.attributes).length?` · ${Object.values(item.attributes).join(' / ')}`:''}`}>{item.sku?`SKU: ${item.sku}`:'Simple product'}{item.attributes&&Object.keys(item.attributes).length?` · ${Object.values(item.attributes).join(' / ')}`:''}</EntitySubtitle></span></EntityCell></TableCell>
          <TableCell numeric><strong className={`nx84-inventory-number ${Number(item.available)===0?'is-out':'is-low'}`}>{item.available}</strong></TableCell><TableCell numeric><span className="nx84-inventory-threshold">{item.threshold}</span></TableCell><TableCell><StatusBadge tone={Number(item.available)===0 ? "danger" : "warning"} >{Number(item.available)===0?'Out of stock':'Low stock'}</StatusBadge></TableCell>
          <TableCell><Button variant="secondary" className="nx50-inventory-edit" type="button"
            onClick={() => setEditor({id:item.productId,name:item.productName,tab:item.variantId?'variants':'details'})}>
            Update stock <UiIcon name="edit" size={17}/></Button></TableCell>
        </TableRow>)}</TableBody></DataTable></TableContainer>}
<Pagination page={page} pages={pages} total={visible.length} pageSize={10} label="stock alerts" onPageChange={setPage}/>
      {(data?.summary.total||0)>500&&<p>Showing the first 500 alerts. More inventory requires attention.</p>}
    </Card>
    {editor&&<AdminProductEditDialog productId={editor.id} name={editor.name} initialTab={editor.tab}
      onClose={() => { setEditor(null); reload(); }} onSaved={() => reload()}/>}
  </AdminLayout>;
}
