import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "http://localhost:4000";
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const config = { credentials: "include", signal: controller.signal };
        const profile = await fetch(`${API}/api/admin/me`, config);
        if (profile.status === 401 || profile.status === 403) {
          navigate("/login", { replace: true }); return;
        }
        if (!profile.ok) throw new Error("Failed to load admin profile.");
        const adminData = await profile.json();
        const response = await fetch(`${API}/api/admin/customers`, config);
        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true }); return;
        }
        if (!response.ok) throw new Error("Failed to load customers.");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setAdmin(adminData.user);
          setCustomers(data.customers);
        }
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [navigate]);
  async function logout() {
    setError("");
    try {
      const response = await fetch(`${API}/api/auth/logout`, {
        method: "POST", credentials: "include"
      });
      if (!response.ok) throw new Error("Logout failed.");
      navigate("/login", { replace: true });
    } catch (err) { setError(err.message); }
  }
  if (loading) return <p>Loading admin dashboard...</p>;
  if (!admin) return <p role="alert">{error || "Admin session unavailable."}</p>;
  return (
    <main className="admin-dashboard">
      <header className="admin-header">
        <div><h1>Admin Dashboard</h1><p>Welcome, {admin.fullName}</p></div>
        <button type="button" onClick={logout}>Logout</button>
      </header>
      <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <Link to="/admin/products">Manage Products</Link>
        <Link to="/admin/products/new">Add New Product</Link>
        <Link to="/products">View Storefront</Link>
      </nav>
      {error && <p role="alert">{error}</p>}
      <section className="admin-section">
        <h2>Registered Customers</h2>
        <p>Showing {customers.length} recent customers (maximum 100). Read-only.</p>
        <div className="table-wrapper">
          <table className="customer-table">
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Registered On</th></tr></thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={4}>No customers found.</td></tr>
              ) : customers.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td><td>{c.fullName}</td><td>{c.email}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
