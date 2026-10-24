import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UiIcon from "../../components/common/UiIcon";
import AdminLayout from "../../components/layout/AdminLayout";
import { getCustomers } from "../../services/adminService";
import { isAuthenticationError } from "../../services/apiClient";

export default function AdminCustomers() {
  const navigate = useNavigate();
  const liveRevision=useRealtimeRevision(["customers"]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [serverQuery, setServerQuery] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setServerQuery(search.trim()), 275);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    async function loadCustomers() {
      try {
        const data = await getCustomers(controller.signal, serverQuery);
        if (!controller.signal.aborted) {
          setCustomers(Array.isArray(data.customers) ? data.customers : []);
          setTotal(Number(data.total ?? data.customers?.length ?? 0));
        }
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
  }, [navigate, serverQuery,liveRevision]);

  const query = search.trim().toLocaleLowerCase();
  const visibleCustomers = customers.filter(customer => !query || [customer.id, customer.fullName, customer.email].some(value => String(value ?? "").toLocaleLowerCase().includes(query)));

  return <AdminLayout title="Customers" subtitle="Registered customer accounts are available here as read-only records.">
    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Customer directory</h2><p>Search registered accounts by name, email or ID. Up to 100 matching records per search.</p></div>
      </div>
      <div className="nx74-customer-tools">
        <label className="nx74-customer-search"><UiIcon name="search" size={19}/><span className="nx74-sr-only">Search customers by name, email or ID</span>
          <input type="search" value={search} placeholder="Search name, email or ID" onChange={event => setSearch(event.target.value)} />
        </label>
        <span className="nx74-search-count" role="status">{loading ? "Loading customers…" : `${visibleCustomers.length} shown · ${total} matches`}</span>
        {search && <button className="nx74-clear-search nx84-admin-reset" type="button" onClick={() => setSearch("")}><UiIcon name="refresh-cw" size={15}/><span className="nx84-reset-label">Clear search</span></button>}
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {loading ? <div className="admin-empty">Loading customers…</div> : <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Customer</th><th>Email</th><th>Registered</th></tr></thead>
          <tbody>{visibleCustomers.length === 0 ? <tr><td colSpan={4}>{query ? "No customers match your search." : "No customers found."}</td></tr> : visibleCustomers.map((customer) => <tr key={customer.id}>
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
