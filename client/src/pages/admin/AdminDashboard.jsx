import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminSummary } from "../../services/adminService";
import { getAdminProducts } from "../../services/productService";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      try {
        const [productsData, summaryData] = await Promise.all([
          getAdminProducts(controller.signal),
          getAdminSummary(controller.signal)
        ]);
        setProducts(productsData.products);
        setSummary(summaryData.summary);
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
    loadDashboard();
    return () => controller.abort();
  }, [navigate]);

  return <AdminLayout title="Dashboard" subtitle="A clear view of the store data currently available."
    actions={<Link className="admin-primary-action" to="/admin/products/new">+ Add product</Link>}>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    <section className="admin-stat-grid" aria-label="Store totals">
      <article className="admin-stat-card">
        <div><p>Total products</p><strong>{loading ? "—" : summary?.productCount ?? 0}</strong></div>
        <span aria-hidden="true">□</span>
        <Link to="/admin/products">Manage products →</Link>
      </article>
      <article className="admin-stat-card">
        <div><p>Active products</p><strong>{loading ? "—" : summary?.activeProductCount ?? 0}</strong></div>
        <span aria-hidden="true">✓</span>
        <Link to="/admin/products">Review catalogue →</Link>
      </article>
      <article className="admin-stat-card">
        <div><p>Registered customers</p><strong>{loading ? "—" : summary?.customerCount ?? 0}</strong></div>
        <span aria-hidden="true">○</span>
        <Link to="/admin/customers">View customers →</Link>
      </article>
    </section>

    <section className="admin-dashboard-grid">
      <article className="admin-panel admin-recent-panel">
        <div className="admin-panel-heading"><div><h2>Recently added products</h2><p>Latest records from the product catalogue.</p></div><Link to="/admin/products">View all</Link></div>
        {loading ? <div className="admin-empty">Loading products…</div> : products.length === 0
          ? <div className="admin-empty">No products have been created yet.</div>
          : <div className="admin-product-list">{products.slice(0, 5).map((product) => <Link to={`/admin/products/${product.id}/edit`} key={product.id}>
            <img src={apiAssetUrl(product.imageUrl)} alt="" />
            <div><strong>{product.name}</strong><small>{product.category} · ₹{Number(product.price).toFixed(2)}</small></div>
            <span className={product.isActive ? "is-active" : "is-inactive"}>{product.isActive ? "Active" : "Inactive"}</span>
          </Link>)}</div>}
      </article>

      <aside className="admin-panel admin-future-panel">
        <p className="admin-eyebrow">Planned workspace</p><h2>Business insights</h2>
        <div><span>Orders</span><strong>Coming Soon</strong></div>
        <div><span>Revenue</span><strong>Coming Soon</strong></div>
        <div><span>Analytics</span><strong>Coming Soon</strong></div>
        <p>These metrics will appear only after their backend features are implemented.</p>
      </aside>
    </section>
  </AdminLayout>;
}
