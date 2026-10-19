import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import ProductEditorWorkspace from "../../components/admin/ProductEditorWorkspace";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminProducts, updateProductStatus, deleteProductPermanently } from "../../services/productService";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
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
    return match && (filter === "all" || (filter === "active" ? product.isActive : !product.isActive));
  }), [products, query, filter]);

  async function changeStatus(product) {
    setBusyId(product.id); setError("");
    try {
      const data = await updateProductStatus(product.id, !product.isActive);
      setProducts(old => old.map(p => p.id === product.id ? { ...p, isActive: data.product.isActive } : p));
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
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
      <div><small>Workspace</small><strong className="nx-summary-text">Ready to edit</strong></div>
    </section>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    <section className="admin-panel nx-products-panel">
      <div className="admin-panel-heading"><div><h2>All products</h2><p>Search by product, brand or category, then edit in a popup.</p></div></div>
      <div className="nx-table-toolbar">
        <label className="admin-search"><span className="sr-only">Search catalogue</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" /></label>
        <div className="nx-filter-pills" aria-label="Product status filter">
          {[ ["all", "All"], ["active", "Active"], ["inactive", "Inactive"] ].map(([value,label]) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
      </div>
      {loading ? <div className="admin-empty">Loading your catalogue…</div> : <div className="admin-table-wrap">
        <table className="admin-table admin-product-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Manage</th></tr></thead>
          <tbody>{visible.length === 0 ? <tr><td colSpan={6}>No products match your search.</td></tr> : visible.map(product => <tr key={product.id}>
            <td><div className="admin-product-cell"><div className="nx-admin-product-image">{product.imageUrl ? <img src={apiAssetUrl(product.imageUrl)} alt=""/> : <span>□</span>}</div><div><strong>{product.name}</strong><small>{product.brand || "Product"} · ID {product.id}</small></div></div></td>
            <td className="admin-muted">{product.category}</td><td><strong>{money(product.displayPrice ?? product.price)}</strong>{product.hasVariants && <small>SKU starting price</small>}</td><td>{product.displayStock ?? product.stock}{product.hasVariants && <small>Across active SKUs</small>}</td>
            <td><span className={`admin-status ${product.isActive ? "is-active" : "is-inactive"}`}>{product.isActive ? "Active" : "Inactive"}</span></td>
            <td><div className="admin-row-actions nx-actions">
              <button className="nx-edit-button" type="button" onClick={() => setEditor({ id: product.id, name: product.name })}>Edit</button>
              <button type="button" disabled={busyId === product.id} onClick={() => changeStatus(product)}>{product.isActive ? "Deactivate" : "Activate"}</button>
              <button className="admin-danger-action" type="button" disabled={busyId === product.id} onClick={() => { setDeleteTarget(product); setDeleteConfirmation(""); setError(""); }}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <p className="nx-helper-copy">Showing {visible.length} of {products.length} loaded products. The current admin API returns up to 100 records.</p>
    </section>
    {editor && <Modal title={`Edit · ${editor.name}`} subtitle="Switch between Details, SKUs and Gallery without leaving the catalogue." size="large" onClose={() => setEditor(null)}>
      <ProductEditorWorkspace key={editor.id} productId={editor.id} onSaved={() => refresh().catch(err => setError(err.message))} />
    </Modal>}
    {deleteTarget && <Modal title="Delete product permanently?" subtitle="This action is irreversible and may be refused when there are historical dependencies." size="small" onClose={() => { if (busyId === null) { setDeleteTarget(null); setDeleteConfirmation(""); } }} closeDisabled={busyId !== null}>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <div className="nx-delete-warning"><strong>{deleteTarget.name}</strong><p>All related SKU and media database records will be removed if the server determines deletion is safe. Local image/video files stay on disk for separate cleanup.</p></div>
      <label className="nx-confirm-label">Enter the exact product name to confirm<input autoComplete="off" value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder={deleteTarget.name}/></label>
      <div className="admin-form-actions"><button className="admin-danger-action" type="button" disabled={busyId !== null || deleteConfirmation !== deleteTarget.name} onClick={remove}>{busyId !== null ? "Deleting…" : "Yes, delete permanently"}</button><button type="button" onClick={() => { setDeleteTarget(null); setDeleteConfirmation(""); }} disabled={busyId !== null}>Cancel</button></div>
    </Modal>}
  </AdminLayout>;
}
