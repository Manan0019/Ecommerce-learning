import { Select, DataTable, Pagination, EmptyState, ClearFilters, SearchInput } from "../ui/index";
import { useEffect, useMemo, useState } from 'react';
import UiIcon from '../common/UiIcon';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const pageNumbers = (current, total) => {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({length: Math.min(5, total)}, (_, i) => start + i);
};

/** Staff-only listing: sorting and pagination never alter assignment eligibility or rates. */
export default function DeliveryTeamTable({ staff, busy, loading, onEdit, onToggle, onDelete }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return staff.filter(member => {
      if (status === 'active' && !member.isActive) return false;
      if (status === 'disabled' && member.isActive) return false;
      return !term || [member.fullName, member.email, member.mobile, member.id]
        .some(value => String(value ?? '').toLocaleLowerCase().includes(term));
    }).sort((a, b) => {
      if (sort === 'name-desc') return b.fullName.localeCompare(a.fullName);
      if (sort === 'open') return Number(b.openDeliveries || 0) - Number(a.openDeliveries || 0) || a.fullName.localeCompare(b.fullName);
      if (sort === 'rate') return Number(b.payRate || 0) - Number(a.payRate || 0) || a.fullName.localeCompare(b.fullName);
      return a.fullName.localeCompare(b.fullName);
    });
  }, [staff, query, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * pageSize;
  const visible = filtered.slice(firstIndex, firstIndex + pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const resetPage = callback => event => { callback(event.target.value); setPage(1); };

  return <div className="nx86-staff-directory">
    <div className="nx86-staff-toolbar">
      <label className="nx77-search-field nx86-staff-search">
        <UiIcon name="search" size={17} />
        <SearchInput aria-label="Search delivery executives" placeholder="Search name, email, mobile or ID" value={query} onChange={resetPage(setQuery)} />
      </label>
      <label className="nx86-staff-select">Status
        <Select aria-label="Filter delivery executives by status" value={status} onChange={resetPage(setStatus)}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
        </Select>
      </label>
      <label className="nx86-staff-select">Sort by
        <Select aria-label="Sort delivery executives" value={sort} onChange={resetPage(setSort)}>
          <option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option>
          <option value="open">Most open deliveries</option><option value="rate">Highest pay rate</option>
        </Select>
      </label>
      <label className="nx86-staff-select nx86-staff-per-page">Rows
        <Select aria-label="Delivery executives per page" value={pageSize} onChange={event => {setPageSize(Number(event.target.value)); setPage(1);}}>
          <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
        </Select>
      </label>
      <ClearFilters active={Boolean(query)||status!=="all"||sort!=="name"} label="Clear executive filters" onClear={()=>{setQuery("");setStatus("all");setSort("name");setPage(1);}}/>
    </div>
    <div className="nx86-staff-count" role="status" aria-live="polite">
      {loading ? 'Loading executives…' : `${filtered.length} of ${staff.length} executives`}
    </div>
    {loading ? <p className="nx86-staff-empty">Loading delivery accounts…</p> : !staff.length ? <EmptyState icon="users" title="No delivery executives yet" description="Use Add delivery person to create the first account."/>
      : !filtered.length ? <EmptyState icon="search" title="No matching executives" description="Clear your search or choose another status."/>
      : <div className="nx46-table-wrap nx86-staff-table-wrap"><DataTable className="nx46-table nx86-staff-table">
        <thead><tr><th scope="col">Executive</th><th scope="col">Contact</th><th scope="col">Pay / delivery</th><th scope="col">Open deliveries</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
        <tbody>{visible.map(member => <tr key={member.id}>
          <td><strong className="nx86-staff-name">{member.fullName}</strong><small className="nx86-staff-meta">ID #{member.id}</small></td>
          <td><span className="nx86-staff-email" title={member.email}>{member.email}</span><small className="nx86-staff-meta">{member.mobile}</small></td>
          <td><strong>{money(member.payRate)}</strong></td>
          <td><strong className="nx55-workload-number">{member.openDeliveries}</strong><small className="nx55-workload-label">active {Number(member.openDeliveries) === 1 ? 'order' : 'orders'}</small></td>
          <td><span className={`nx46-pill ${member.isActive ? 'good' : 'muted'}`}>{member.isActive ? 'Active' : 'Disabled'}</span></td>
          <td><div className="nx80-executive-actions nx86-staff-actions">
            <button type="button" className="nx80-icon-btn" title="Edit details and pay rate" aria-label={`Edit ${member.fullName}`} disabled={busy} onClick={() => onEdit(member)}><UiIcon name="edit" size={18}/></button>
            <button type="button" className="nx80-icon-btn" title={member.isActive ? 'Disable account' : 'Enable account'} aria-label={`${member.isActive ? 'Disable' : 'Enable'} ${member.fullName}`} disabled={busy} onClick={() => onToggle(member)}><UiIcon name={member.isActive ? 'ban' : 'check-circle'} size={18}/></button>
            <button type="button" className="nx80-icon-btn nx80-icon-danger" title={Number(member.totalAssignments || 0) > 0 ? 'Delivery history exists — disable instead' : 'Delete unused executive'} aria-label={`Delete ${member.fullName}`} disabled={busy || Number(member.totalAssignments || 0) > 0} onClick={() => onDelete(member)}><UiIcon name="trash" size={18}/></button>
          </div></td>
        </tr>)}</tbody>
      </DataTable></div>}
    {!loading && filtered.length > 0 && <Pagination page={currentPage} pages={totalPages} total={filtered.length} pageSize={pageSize} label="executives" onPageChange={setPage}/>} 
  </div>;
}
