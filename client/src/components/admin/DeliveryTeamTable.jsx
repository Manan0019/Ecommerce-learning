import usePagination from '../../hooks/usePagination';
import { ClearFilters, DataTable, EmptyState, EntitySubtitle, EntityTitle, FormField, IconActionGroup, IconButton, Pagination, SearchField, Select, StatusBadge, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "../ui/index";

import { useMemo, useState } from 'react';
import UiIcon from '../common/UiIcon';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

/** Staff-only listing: sorting and pagination never alter assignment eligibility or rates. */
export default function DeliveryTeamTable({ staff, busy, loading, onEdit, onToggle, onDelete }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('name');



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

  const {page:currentPage,pages:totalPages,items:visible,setPage} = usePagination(filtered, JSON.stringify([query,status,sort]));
  const resetPage = callback => event => { callback(event.target.value); setPage(1); };

  return <div className="nx86-staff-directory">
    <div className="nx86-staff-toolbar">
      <SearchField aria-label="Search delivery executives" placeholder="Search name, email, mobile or ID" value={query} onChange={resetPage(setQuery)} />
      <FormField className="nx86-staff-select">Status
        <Select aria-label="Filter delivery executives by status" value={status} onChange={resetPage(setStatus)}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
        </Select>
      </FormField>
      <FormField className="nx86-staff-select">Sort by
        <Select aria-label="Sort delivery executives" value={sort} onChange={resetPage(setSort)}>
          <option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option>
          <option value="open">Most open deliveries</option><option value="rate">Highest pay rate</option>
        </Select>
      </FormField>

      <ClearFilters active={Boolean(query)||status!=="all"||sort!=="name"} label="Clear executive filters" onClear={()=>{setQuery("");setStatus("all");setSort("name");setPage(1);}}/>
    </div>
    <div className="nx86-staff-count" role="status" aria-live="polite">
      {loading ? 'Loading executives…' : `${filtered.length} of ${staff.length} executives`}
    </div>
    {loading ? <p className="nx86-staff-empty">Loading delivery accounts…</p> : !staff.length ? <EmptyState icon="users" title="No delivery executives yet" description="Use Add delivery person to create the first account."/>
      : !filtered.length ? <EmptyState icon="search" title="No matching executives" description="Clear your search or choose another status."/>
      : <TableContainer className="nx46-table-wrap nx86-staff-table-wrap"><DataTable className="nx46-table nx86-staff-table">
        <TableHead><TableRow><TableHeader scope="col">Executive</TableHeader><TableHeader scope="col">Contact</TableHeader><TableHeader align="end" scope="col">Pay / delivery</TableHeader><TableHeader align="end" scope="col">Open deliveries</TableHeader><TableHeader scope="col">Status</TableHeader><TableHeader scope="col">Actions</TableHeader></TableRow></TableHead>
        <TableBody>{visible.map(member => <TableRow key={member.id}>
          <TableCell><EntityTitle >{member.fullName}</EntityTitle><EntitySubtitle className="nx86-staff-meta">ID #{member.id}</EntitySubtitle></TableCell>
          <TableCell><span className="nx86-staff-email" title={member.email}>{member.email}</span><EntitySubtitle className="nx86-staff-meta">{member.mobile}</EntitySubtitle></TableCell>
          <TableCell numeric><strong>{money(member.payRate)}</strong></TableCell>
          <TableCell numeric><strong className="nx55-workload-number">{member.openDeliveries}</strong><small className="nx55-workload-label">active {Number(member.openDeliveries) === 1 ? 'order' : 'orders'}</small></TableCell>
          <TableCell><StatusBadge tone={member.isActive ? "success" : "neutral"} >{member.isActive ? 'Active' : 'Disabled'}</StatusBadge></TableCell>
          <TableCell actions><IconActionGroup >
            <IconButton variant="secondary" type="button"  title="Edit details and pay rate" aria-label={`Edit ${member.fullName}`} disabled={busy} onClick={() => onEdit(member)}><UiIcon name="edit" size={18}/></IconButton>
            <IconButton variant="secondary" type="button"  title={member.isActive ? 'Disable account' : 'Enable account'} aria-label={`${member.isActive ? 'Disable' : 'Enable'} ${member.fullName}`} disabled={busy} onClick={() => onToggle(member)}><UiIcon name={member.isActive ? 'ban' : 'check-circle'} size={18}/></IconButton>
            <IconButton variant="danger" type="button"  title={Number(member.totalAssignments || 0) > 0 ? 'Delivery history exists — disable instead' : 'Delete unused executive'} aria-label={`Delete ${member.fullName}`} disabled={busy || Number(member.totalAssignments || 0) > 0} onClick={() => onDelete(member)}><UiIcon name="trash" size={18}/></IconButton>
          </IconActionGroup></TableCell>
        </TableRow>)}</TableBody>
      </DataTable></TableContainer>}
    {!loading && filtered.length > 0 && <Pagination page={currentPage} pages={totalPages} total={filtered.length} label="executives" onPageChange={setPage}/>} 
  </div>;
}
