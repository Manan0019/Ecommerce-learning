import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { getCustomers } from "../../services/adminService";
import { isAuthenticationError } from "../../services/apiClient";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadCustomers() {
      try {
        const data = await getCustomers(controller.signal);
        setCustomers(data.customers);
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
    loadCustomers();
    return () => controller.abort();
  }, [navigate]);

  return <AdminLayout title="Customers" subtitle="Registered customer accounts are available here as read-only records.">
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Customer directory</h2><p>Showing {customers.length} recent customers (maximum 100).</p></div>
        <span className="admin-readonly-badge">Read only</span>
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {loading ? <div className="admin-empty">Loading customers…</div> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Customer</th><th>Email</th><th>Registered</th></tr></thead>
          <tbody>{customers.length === 0 ? <tr><td colSpan={4}>No customers found.</td></tr> : customers.map((customer) => <tr key={customer.id}>
            <td className="admin-muted">#{customer.id}</td>
            <td><strong>{customer.fullName}</strong></td>
            <td>{customer.email}</td>
            <td>{new Date(customer.createdAt).toLocaleDateString()}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </AdminLayout>;
}
