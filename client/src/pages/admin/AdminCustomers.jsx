import { Card, ClearFilters, DataTable, EmptyState, EntityTitle, Pagination, SearchField, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "../../components/ui/index";

import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [page,setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => { setServerQuery(search.trim()); setPage(1); }, 275);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(()=>{if(!controller.signal.aborted){setLoading(true);setError("");}});
    async function loadCustomers() {
      try {
        const data = await getCustomers(controller.signal, serverQuery, page);
        if (!controller.signal.aborted) {
          setCustomers(Array.isArray(data.customers) ? data.customers : []);
          setTotal(Number(data.total ?? data.customers?.length ?? 0));setPage(current=>Math.min(current,Math.max(1,Math.ceil(Number(data.total??data.customers?.length??0)/10))));
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
  }, [navigate, serverQuery, page, liveRevision]);

  const visibleCustomers = customers;
  const pages = Math.max(1, Math.ceil(total / 10));

  return <AdminLayout title="Customers" subtitle="Registered customer accounts are available here as read-only records.">
    <Card as="section" className="admin-panel">
      <div className="admin-panel-heading">
        <div><h2>Customer directory</h2><p>Search registered accounts by name, email or ID.</p></div>
      </div>
      <div className="nx74-customer-tools">
        <SearchField value={search} placeholder="Search name, email or ID" onChange={event => setSearch(event.target.value)} />
        <span className="nx74-search-count" role="status">{loading ? "Loading customers…" : `${visibleCustomers.length} shown · ${total} matches`}</span>
        {<ClearFilters active={Boolean(search)} label="Clear customer search" onClear={()=>setSearch("")}/>} 
      </div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {loading ? <div className="admin-empty">Loading customers…</div> : <TableContainer className="admin-table-wrap">
        <DataTable className="admin-table">
          <TableHead><TableRow><TableHeader>ID</TableHeader><TableHeader>Customer</TableHeader><TableHeader>Email</TableHeader><TableHeader>Registered</TableHeader></TableRow></TableHead>
          <TableBody>{visibleCustomers.length === 0 ? <TableRow><TableCell colSpan={4}><EmptyState icon="users" title={search?"No matching customers":"No customers yet"} description={search?"Try a different name, email or ID.":"New customer accounts will appear here."}/></TableCell></TableRow> : visibleCustomers.map((customer) => <TableRow key={customer.id}>
            <TableCell className="admin-muted">#{customer.id}</TableCell>
            <TableCell><EntityTitle>{customer.fullName}</EntityTitle></TableCell>
            <TableCell>{customer.email}</TableCell>
            <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
          </TableRow>)}</TableBody>
        </DataTable>
      </TableContainer>}
      <Pagination page={page} pages={pages} total={total} pageSize={10} label="customers" onPageChange={setPage}/>
    </Card>
  </AdminLayout>;
}
