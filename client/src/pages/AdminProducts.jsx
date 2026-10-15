
    
  
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "http://localhost:4000";
export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const loadProducts = useCallback(async signal => {
    try {
      const response = await fetch(`${API}/api/admin/products`, {
        credentials: "include", signal
      });
      if (response.status === 401 || response.status === 403) {
        navigate("/admin/login", { replace: true }); return;
      }
      if (!response.ok) throw new Error("Failed to load products.");
      const data = await response.json();
      if (!signal?.aborted) setProducts(data.products);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    const controller = new AbortController();
    loadProducts(controller.signal);
    return () => controller.abort();
  }, [loadProducts]);
  async function changeStatus(product) {
    const nextStatus = !product.isActive;
    setBusyId(product.id); setError("");
    try {
      const response = await fetch(`${API}/api/admin/products/${product.id}/status`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextStatus })
      });
      if (response.status === 401 || response.status === 403) {
        navigate("/admin/login", { replace: true }); return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not change status.");
      setProducts(previous => previous.map(p => p.id === product.id
        ? { ...p, isActive: data.product.isActive } : p));
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }
  if (loading) return <p>Loading products...</p>;
  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <h1>Manage Products</h1>
        <Link to="/admin/products/new">Add Product</Link>
      </header>
      <p><Link to="/admin/dashboard">← Admin Dashboard</Link></p>
      <p>Showing {products.length} latest products (maximum 100).</p>
      {error && <p role="alert">{error}</p>}
      <div className="table-wrapper">
        <table className="customer-table">
          <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6}>No products found.</td></tr>
            ) : products.map(p => (
              <tr key={p.id}>
                <td><img src={`${API}${p.imageUrl}`} alt={p.name} width={60} height={60}
                  style={{ objectFit: "cover" }}/></td>
                <td>{p.name}</td>
                <td>₹{Number(p.price).toFixed(2)}</td>
                <td>{p.stock}</td>
                <td>{p.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <Link to={`/admin/products/${p.id}/edit`}>Edit</Link>{" | "}
                  <button type="button" disabled={busyId === p.id}
                    onClick={() => changeStatus(p)}>
                    {busyId === p.id ? "Saving..." : p.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

