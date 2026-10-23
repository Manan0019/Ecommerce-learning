import { useEffect, useMemo, useState } from "react";
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
  const [products, setProducts] = useState([]);
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

  async function refresh() {
    const data = await getAdminProducts();
    setProducts(data.products || []);
  }
  useEffect(() => {
    const controller = new AbortController();
    getAdminProducts(controller.signal).then(data => {
      if (!controller.signal.aborted) setProducts(data.products || []);
    }).catch(err => {
      if (controller.signal.aborted) return;
      if (isAuthenticationError(err)) navigate("/login", { replace: true });
      else setError(err.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [navigate]);

  const visible = useMemo(() => products.filter(product => {
    const match = `${product.name} ${product.brand || ""} ${product.category || ""}`.toLowerCase().includes(query.toLowerCase().trim());
    const available = Number(product.displayStock ?? product.stock ?? 0);
    return match && (filter === "all" || (filter === "active" ? product.isActive : !product.isActive))
      && (categoryFilter==='all'||product.category===categoryFilter)
      && (brandFilter==='all'||product.brand===brandFilter)
      && (stockFilter==='all'||(stockFilter==='out'?available<=0:stockFilter==='low'?available>0&&available<=5:available>5));
  }), [products, query, filter,categoryFilter,brandFilter,stockFilter]);
  const categories=useMemo(()=>[...new Set(products.map(p=>p.category).filter(Boolean))].sort(),[products]);
  const brands=useMemo(()=>[...new Set(products.map(p=>p.brand).filter(Boolean))].sort(),[products]);

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
      setProducts(old => old.map(p => p.id === product.id ? { ...p, isActive: data.product.isActive } : p));
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
      setProducts(old => old.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null); setDeleteConfirmation("");
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }

  return <AdminLayout title="Product catalogue" subtitle="Manage your products without leaving this workspace."
    actions={<Link className="admin-primary-action" to="/admin/products/new">+ Add new product</Link>}>
    <section className="nx-admin-summary" aria-label="Catalogue summary">
      <div><small>Products loaded</small><strong>{products.length}</strong></div>
      <div><small>Published</small><strong>{products.filter(p => p.isActive).length}</strong></div>
      <div><small>Inactive</small><strong>{products.filter(p => !p.isActive).length}</strong></div>
      <div><small>Low or no stock</small><strong>{products.filter(p=>Number(p.displayStock??p.stock??0)<=5).length}</strong></div>
    </section>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    <section className="admin-panel nx-products-panel">
      <div className="admin-panel-heading"><div><h2>All products</h2><p>Click any product to preview it. The Edit button opens its editor here.</p></div></div>
      <div className="nx-table-toolbar">
        <label className="admin-search nx69-search"><span className="sr-only">Search catalogue</span><UiIcon name="search" size={19}/><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" /></label>
        <div className="nx-filter-pills" aria-label="Product status filter">
          {[ ["all", "All"], ["active", "Active"], ["inactive", "Inactive"] ].map(([value,label]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
      </div>
      <div className="nx69-product-filters" aria-label="Catalogue filters">
        <label><UiIcon name="filter" size={17}/><span className="sr-only">Category</span><select aria-label="Filter by category" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
        <label><span className="sr-only">Brand</span><select aria-label="Filter by brand" value={brandFilter} onChange={e=>setBrandFilter(e.target.value)}><option value="all">All brands</option>{brands.map(v=><option key={v} value={v}>{v}</option>)}</select></label>
        <label><span className="sr-only">Stock</span><select aria-label="Filter by stock" value={stockFilter} onChange={e=>setStockFilter(e.target.value)}><option value="all">All stock levels</option><option value="out">Out of stock</option><option value="low">Low stock (1–5)</option><option value="healthy">Above 5 in stock</option></select></label>
        <button type="button" className="nx69-filter-reset" onClick={()=>{setQuery('');setFilter('all');setCategoryFilter('all');setBrandFilter('all');setStockFilter('all');}}>Reset filters</button>
        <span className="nx69-filter-total" role="status">{visible.length} matching products</span>
      </div>
      {loading ? <div className="admin-empty">Loading your catalogue…</div> : <div className="admin-table-wrap">
        <table className="admin-table admin-product-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Manage</th></tr></thead>
          <tbody>{visible.length === 0 ? <tr><td colSpan={6}>No products match your search.</td></tr> : visible.map(product => <tr key={product.id} className="nx50-product-row" tabIndex={0}
            aria-label={`Preview ${product.name}. Use the Edit button to edit without navigating.`}
            onClick={event => openProductPreview(event, product)}
            onKeyDown={event => openProductPreview(event, product)}>
            <td><div className="admin-product-cell"><Link className="nx-admin-product-image" to={`/admin/products/${product.id}/preview`} state={{from:"/admin/products"}} title={`View ${product.name}`}>{product.imageUrl ? <img src={apiAssetUrl(product.imageUrl)} alt=""/> : <span>□</span>}</Link><div><Link className="nx46-product-title" title={product.name} to={`/admin/products/${product.id}/preview`} state={{from:"/admin/products"}}>{product.name}</Link><small>{product.brand || "Product"} · ID {product.id}</small></div></div></td>
            <td className="admin-muted">{product.category}</td><td><strong>{money(product.displayPrice ?? product.price)}</strong>{product.hasVariants && <small>SKU starting price</small>}</td><td>{product.displayStock ?? product.stock}{product.hasVariants && <small>Across active SKUs</small>}</td>
            <td><span className={`admin-status ${product.isActive ? "is-active" : "is-inactive"}`}>{product.isActive ? "Active" : "Inactive"}</span></td>
            <td><div className="admin-row-actions nx-actions">
              <Link className="nx69-icon-action nx70-preview-action" title="Preview product" aria-label={`Preview ${product.name}`} to={`/admin/products/${product.id}/preview`} state={{from:"/admin/products"}}><UiIcon name="eye" size={17}/></Link>
              <button className="nx69-icon-action" title="Edit product" aria-label={`Edit ${product.name}`} type="button" onClick={() => setEditor({ id: product.id, name: product.name })}><UiIcon name="edit" size={17}/></button>
              <button className="nx69-icon-action" title={product.isActive?'Deactivate product':'Activate product'} aria-label={`${product.isActive?'Deactivate':'Activate'} ${product.name}`} type="button" disabled={busyId === product.id} onClick={() => changeStatus(product)}><UiIcon name={product.isActive?'ban':'check'} size={17}/></button>
              <button className={`nx69-icon-action nx69-sale-action ${product.showSaleBadge ? "nx70-sale-on" : "nx70-sale-off"}`} aria-pressed={Boolean(product.showSaleBadge)} type="button" disabled={busyId === product.id} title={product.showSaleBadge?'Hide sale label':'Show sale label (requires a real price reduction)'} aria-label={`${product.showSaleBadge?'Hide':'Show'} sale badge for ${product.name}`} onClick={() => toggleSaleBadge(product)}><span aria-hidden="true">SALE</span><span className="sr-only">{product.showSaleBadge ? "enabled" : "disabled"}</span></button>
              <button className="nx69-icon-action nx69-icon-danger" title="Delete product" aria-label={`Delete ${product.name}`} type="button" disabled={busyId === product.id} onClick={() => { setDeleteTarget(product); setDeleteConfirmation(""); setError(""); }}><UiIcon name="trash" size={17}/></button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="nx-helper-copy">Showing {visible.length} of {products.length} loaded products. The current admin API returns up to 100 records.</p>
    </section>
    {editor && <AdminProductEditDialog productId={editor.id} name={editor.name}
      onClose={() => { setEditor(null); refresh().catch(err => setError(err.message)); }}
      onSaved={() => refresh().catch(err => setError(err.message))}/>}
    {deleteTarget && <Modal title="Delete product permanently?" subtitle="This action is irreversible and may be refused when there are historical dependencies." size="small" onClose={() => { if (busyId === null) { setDeleteTarget(null); setDeleteConfirmation(""); } }} closeDisabled={busyId !== null}>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <div className="nx-delete-warning"><strong>{deleteTarget.name}</strong><p>All related SKU and media database records will be removed if the server determines deletion is safe. Local image/video files stay on disk for separate cleanup.</p></div>
      <label className="nx-confirm-label">Enter the exact product name to confirm<input autoComplete="off" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder={deleteTarget.name}/></label>
      <div className="admin-form-actions"><button className="admin-danger-action" type="button" disabled={busyId !== null || deleteConfirmation !== deleteTarget.name} onClick={remove}>{busyId !== null ? "Deleting…" : "Yes, delete permanently"}</button><button type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(""); }} disabled={busyId !== null}>Cancel</button></div>
    </Modal>}
  </AdminLayout>;
}
