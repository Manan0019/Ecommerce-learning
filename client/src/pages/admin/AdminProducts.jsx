import { EntityCell, MetricCard, Button, Card, ClearFilters, DataTable, EmptyState, EntitySubtitle, EntityTitle, FormField, IconActionGroup, IconButton, Pagination, SearchField, Select, StatusBadge, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TextField } from "../../components/ui/index";

import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import UiIcon from "../../components/common/UiIcon";
import AdminProductEditDialog from "../../components/admin/AdminProductEditDialog";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminProducts, updateProductStatus, deleteProductPermanently, setSaleBadge } from "../../services/productService";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function AdminProducts() {
  const navigate = useNavigate();
 const liveRevision=useRealtimeRevision(['catalog', 'inventory']);
  const [products, setProducts] = useState([]);
  const [page,setPage]=useState(1),[total,setTotal]=useState(0),[sort,setSort]=useState('newest'),[revision,setRevision]=useState(0);
  const [facets,setFacets]=useState({categories:[],brands:[]}),[summary,setSummary]=useState({total:0,active:0,inactive:0});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter,setCategoryFilter]=useState('all');
  const [brandFilter,setBrandFilter]=useState('all');
  const [stockFilter,setStockFilter]=useState('all');
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  function refresh(){setRevision(x=>x+1);}
  useEffect(() => {
    const controller = new AbortController();
    const timer=setTimeout(()=>{
      setLoading(true);
      getAdminProducts(controller.signal,{page,q:query,status:filter,category:categoryFilter,brand:brandFilter,stock:stockFilter,sort}).then(data => {
        if (controller.signal.aborted) return;
        setProducts(data.products || []);setTotal(Number(data.total||0));setPage(current=>Math.min(current,Math.max(1,Math.ceil(Number(data.total||0)/10))));
        setFacets(data.facets||{categories:[],brands:[]});setSummary(data.summary||{total:0,active:0,inactive:0});setError('');
      }).catch(err => {
        if (controller.signal.aborted) return;
        if (isAuthenticationError(err)) navigate("/login", { replace: true });else setError(err.message);
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    },query?200:0);
    return () => {clearTimeout(timer);controller.abort();};
  }, [navigate,page,query,filter,categoryFilter,brandFilter,stockFilter,sort,revision,liveRevision]);

  const visible=products;
  const categories=facets.categories||[];
  const brands=facets.brands||[];
  const pages=Math.max(1,Math.ceil(total/10));
  function openProductPreview(event, product) {
    // Links and controls in the row already have independent actions.
    if (event.type === "click" && event.target.closest("a, button, input, select, textarea")) return;
    if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
    if (event.type === "keydown" && event.target !== event.currentTarget) return;
    event.preventDefault();
    navigate(`/admin/products/${product.id}/preview`, { state: { from: "/admin/products" } });
  }

  async function changeStatus(product) {
    setBusyId(product.id); setError("");
    try {
      const data = await updateProductStatus(product.id, !product.isActive);
      setProducts(old => old.map(p => p.id === product.id ? { ...p, isActive: data.product.isActive } : p)); refresh();
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }

  async function toggleSaleBadge(product) {
    setBusyId(product.id);setError("");
    try{const result=await setSaleBadge(product.id,!product.showSaleBadge);
      setProducts(previous=>previous.map(p=>p.id===product.id?{...p,showSaleBadge:result.showSaleBadge}:p));
    }catch(e){setError(e.message);}finally{setBusyId(null);}
  }

  async function remove() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return;
    setBusyId(deleteTarget.id); setError("");
    try {
      await deleteProductPermanently(deleteTarget.id, deleteConfirmation);
      refresh();
      setDeleteTarget(null); setDeleteConfirmation("");
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }

  return <AdminLayout title="Product catalogue" subtitle="Manage your products without leaving this workspace."
    actions={<Button as={Link} variant="primary"  to="/admin/products/new">+ Add new product</Button>}>
    <section className="nx-admin-summary" aria-label="Catalogue summary">
      <MetricCard as="div" tone="neutral" label={<>All products</>} value={<>{summary.total}</>}/>
      <MetricCard as="div" tone="neutral" label={<>Published</>} value={<>{summary.active}</>}/>
      <MetricCard as="div" tone="neutral" label={<>Inactive</>} value={<>{summary.inactive}</>}/>
      <MetricCard as="div" tone="neutral" label={<>Matching filters</>} value={<>{total}</>}/>
    </section>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    <Card as="section" className="admin-panel nx-products-panel">
      <div className="admin-panel-heading"><div><h2>All products</h2><p>Click any product to preview it. The Edit button opens its editor here.</p></div></div>
      <div className="nx-table-toolbar">
        <SearchField value={query} onChange={e => {setQuery(e.target.value);setPage(1);}} placeholder="Search products…" />
        <div className="nx-filter-pills" aria-label="Product status filter">
          {[ ["all", "All"], ["active", "Active"], ["inactive", "Inactive"] ].map(([value,label]) => <Button variant="secondary" type="button" key={value} aria-pressed={filter === value} className={filter === value ? "is-active" : ""} onClick={() => {setFilter(value);setPage(1);}}>{label}</Button>)}
        </div>
      </div>
      <div className="nx69-product-filters" aria-label="Catalogue filters">
        <FormField label="Category"><Select aria-label="Filter by category" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1);}}><option value="all">All categories</option>{categories.map(v=><option key={v} value={v}>{v}</option>)}</Select></FormField>
        <FormField label="Brand"><Select aria-label="Filter by brand" value={brandFilter} onChange={e=>{setBrandFilter(e.target.value);setPage(1);}}><option value="all">All brands</option>{brands.map(v=><option key={v} value={v}>{v}</option>)}</Select></FormField>
        <FormField label="Stock"><Select aria-label="Filter by stock" value={stockFilter} onChange={e=>{setStockFilter(e.target.value);setPage(1);}}><option value="all">All stock levels</option><option value="out">Out of stock</option><option value="low">Low stock (1–5)</option><option value="healthy">Above 5 in stock</option></Select></FormField>
        <ClearFilters active={Boolean(query)||filter!=='all'||categoryFilter!=='all'||brandFilter!=='all'||stockFilter!=='all'||sort!=='newest'} label="Clear product filters" onClear={()=>{setQuery('');setFilter('all');setCategoryFilter('all');setBrandFilter('all');setStockFilter('all');setPage(1);setSort('newest');}}/>
        <FormField className="nx71-products-sort">Sort <Select value={sort} aria-label="Sort products" onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A–Z</option><option value="stock">Lowest stock</option></Select></FormField><span className="nx69-filter-total" role="status">{total} matching products</span>
      </div>
      {loading ? <div className="admin-empty">Loading your catalogue…</div> : <TableContainer className="admin-table-wrap">
        <DataTable className="admin-table admin-product-table">
          <TableHead><TableRow><TableHeader>Product</TableHeader><TableHeader>Category</TableHeader><TableHeader align="end">Price</TableHeader><TableHeader align="end">Stock</TableHeader><TableHeader>Status</TableHeader><TableHeader>Manage</TableHeader></TableRow></TableHead>
          <TableBody>{visible.length === 0 ? <TableRow><TableCell colSpan={6}><EmptyState title={summary.total?"No matching products":"No products yet"} description={summary.total?"Try another search or clear your filters.":"Add your first product to build the catalogue."}/></TableCell></TableRow> : visible.map(product => <TableRow key={product.id} className="nx50-product-row" tabIndex={0}
            aria-label={`Preview ${product.name}. Use the Edit button to edit without navigating.`}
            onClick={event => openProductPreview(event, product)}
            onKeyDown={event => openProductPreview(event, product)}>
            <TableCell><EntityCell className="admin-product-cell"><Link  className="nx-admin-product-image" to={`/admin/products/${product.id}/preview`} state={{from:"/admin/products"}} title={`View ${product.name}`}>{product.imageUrl ? <img src={apiAssetUrl(product.imageUrl)} alt=""/> : <span>□</span>}</Link><div><EntityTitle as={Link}  title={product.name} to={`/admin/products/${product.id}/preview`} state={{from:"/admin/products"}}>{product.name}</EntityTitle><EntitySubtitle>{product.brand || "Product"} · ID {product.id}</EntitySubtitle></div></EntityCell></TableCell>
            <TableCell className="admin-muted">{product.category}</TableCell><TableCell numeric><strong>{money(product.displayPrice ?? product.price)}</strong>{product.hasVariants && <small>SKU starting price</small>}</TableCell><TableCell numeric>{product.displayStock ?? product.stock}{product.hasVariants && <small>Across active SKUs</small>}</TableCell>
            <TableCell><StatusBadge tone={product.isActive ? "success" : "neutral"} >{product.isActive ? "Active" : "Inactive"}</StatusBadge></TableCell>
            <TableCell actions><IconActionGroup >
              <IconButton as={Link} variant="secondary" className="nx70-preview-action" title="Preview product" aria-label={`Preview ${product.name}`} to={`/admin/products/${product.id}/preview`} state={{from:"/admin/products"}}><UiIcon name="eye" size={17}/></IconButton>
              <IconButton variant="secondary"  title="Edit product" aria-label={`Edit ${product.name}`} type="button" onClick={() => setEditor({ id: product.id, name: product.name })}><UiIcon name="edit" size={17}/></IconButton>
              <IconButton variant="secondary"  title={product.isActive?'Deactivate product':'Activate product'} aria-label={`${product.isActive?'Deactivate':'Activate'} ${product.name}`} type="button" disabled={busyId === product.id} onClick={() => changeStatus(product)}><UiIcon name={product.isActive?'ban':'check'} size={17}/></IconButton>
              <IconButton variant={product.showSaleBadge ? "success" : "secondary"} className={`nx91-sale-toggle${product.showSaleBadge ? " is-active" : ""}`} aria-pressed={Boolean(product.showSaleBadge)} type="button" disabled={busyId === product.id} title={product.showSaleBadge?'Hide sale label':'Show sale label (requires a real price reduction)'} aria-label={`${product.showSaleBadge?'Hide':'Show'} sale badge for ${product.name}`} onClick={() => toggleSaleBadge(product)}><span aria-hidden="true">SALE</span><span className="sr-only">{product.showSaleBadge ? "enabled" : "disabled"}</span></IconButton>
              <IconButton variant="danger"  title="Delete product" aria-label={`Delete ${product.name}`} type="button" disabled={busyId === product.id} onClick={() => { setDeleteTarget(product); setDeleteConfirmation(""); setError(""); }}><UiIcon name="trash" size={17}/></IconButton>
            </IconActionGroup></TableCell>
          </TableRow>)}</TableBody>
        </DataTable>
      </TableContainer>}
      <Pagination page={page} pages={pages} total={total} pageSize={10} label="products" onPageChange={setPage}/>
    </Card>
    {editor && <AdminProductEditDialog productId={editor.id} name={editor.name}
      onClose={() => { setEditor(null); refresh(); }}
      onSaved={refresh}/>}
    {deleteTarget && <Modal title="Delete product permanently?" subtitle="This action is irreversible and may be refused when there are historical dependencies." size="small" onClose={() => { if (busyId === null) { setDeleteTarget(null); setDeleteConfirmation(""); } }} closeDisabled={busyId !== null}>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <div className="nx-delete-warning"><strong>{deleteTarget.name}</strong><p>All related SKU and media database records will be removed if the server determines deletion is safe. Local image/video files stay on disk for separate cleanup.</p></div>
      <FormField className="nx-confirm-label">Enter the exact product name to confirm<TextField autoComplete="off" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder={deleteTarget.name}/></FormField>
      <div className="admin-form-actions"><Button variant="danger"  type="button" disabled={busyId !== null || deleteConfirmation !== deleteTarget.name} onClick={remove}>{busyId !== null ? "Deleting…" : "Yes, delete permanently"}</Button><Button variant="secondary" type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(""); }} disabled={busyId !== null}>Cancel</Button></div>
    </Modal>}
  </AdminLayout>;
}
