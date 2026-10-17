import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminProducts, updateProductStatus, deleteProductPermanently } from "../../services/productService";

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [deleteTarget,setDeleteTarget] = useState(null);
  const [deleteConfirmation,setDeleteConfirmation] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const data = await getAdminProducts(controller.signal);
        if (!controller.signal.aborted) setProducts(data.products);
      } catch (requestError) {
        if (isAuthenticationError(requestError)) {
          navigate("/login", { replace: true });
          return;
        }
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [navigate]);

  async function changeStatus(product) {
    const nextStatus = !product.isActive;
    setBusyId(product.id);
    setError("");
    try {
      const data = await updateProductStatus(product.id, nextStatus);
      setProducts((previous) => previous.map((item) => item.id === product.id
        ? { ...item, isActive: data.product.isActive } : item));
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return;
    setBusyId(deleteTarget.id);
    setError("");
    try {
      await deleteProductPermanently(deleteTarget.id,deleteConfirmation);
      setProducts(old=>old.filter(item=>item.id!==deleteTarget.id));
      setDeleteTarget(null);setDeleteConfirmation("");
    } catch (e) { if(isAuthenticationError(e)){navigate("/login",{replace:true});return;}setError(e.message); }
    finally { setBusyId(null); }
  }

  return <AdminLayout title="Manage Products" subtitle="Create, edit, stock, and publish products in your catalogue."
    actions={<Link className="admin-primary-action" to="/admin/products/new">+ Add product</Link>}>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    {deleteTarget&&<section className="admin-delete-confirm" role="dialog" aria-modal="true" aria-label="Confirm permanent product deletion">
      <h3>Delete {deleteTarget.name} permanently?</h3>
      <p>Its SKU variants, gallery database records and wishlist entries will be removed. Uploaded image/video files remain on disk for separate safe cleanup. This cannot be undone.</p>
      <label>Type the exact product name: <strong>{deleteTarget.name}</strong>
        <input autoFocus value={deleteConfirmation} onChange={e=>setDeleteConfirmation(e.target.value)}/></label>
      <div className="admin-form-actions">
        <button type="button" className="admin-danger-action" disabled={busyId!==null||deleteConfirmation!==deleteTarget.name} onClick={permanentlyDelete}>Permanently delete product</button>
        <button type="button" onClick={()=>{setDeleteTarget(null);setDeleteConfirmation("");}}>Cancel</button>
      </div>
    </section>}
    <section className="admin-panel">
      <div className="admin-panel-heading"><div><h2>Product catalogue</h2><p>{products.length} latest products (maximum 100).</p></div></div>
      {loading ? <div className="admin-empty">Loading products…</div> : <div className="admin-table-wrap">
        <table className="admin-table admin-product-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{products.length === 0 ? <tr><td colSpan={6}>No products found.</td></tr> : products.map((product) => <tr key={product.id}>
            <td><div className="admin-product-cell"><img src={apiAssetUrl(product.imageUrl)} alt="" /><strong>{product.name}</strong></div></td>
            <td className="admin-muted">{product.category}</td>
            <td>₹{Number(product.price).toFixed(2)}</td>
            <td>{product.stock}</td>
            <td><span className={`admin-status ${product.isActive ? "is-active" : "is-inactive"}`}>{product.isActive ? "Active" : "Inactive"}</span></td>
            <td><div className="admin-row-actions">
              <Link to={`/admin/products/${product.id}/edit`}>Edit</Link>
              <button type="button" disabled={busyId === product.id} onClick={() => changeStatus(product)}>
                {busyId === product.id ? "Saving…" : product.isActive ? "Deactivate" : "Activate"}
              </button>
              <button className="admin-danger-action" type="button" disabled={busyId===product.id}
                onClick={()=>{setDeleteTarget(product);setDeleteConfirmation("");setError("");}}>Delete</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </AdminLayout>;
}
