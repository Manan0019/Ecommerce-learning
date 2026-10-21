import {useMemo, useState} from 'react';
import Modal from '../common/Modal';
import UiIcon from '../common/UiIcon';
import {deliveryTeamWithWorkload, filterDeliveryTeam} from '../../services/deliveryAssignmentView';

/** A review-and-confirm selector; assignment is never made by merely selecting a row. */
export default function DeliveryExecutivePicker({order, current, staff, assignments, onAssign, onClose, busy = false, error = ''}) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(current?.executiveId ? String(current.executiveId) : '');
  const team = useMemo(() => deliveryTeamWithWorkload(staff, assignments), [staff, assignments]);
  const filtered = useMemo(() => filterDeliveryTeam(team, search), [team, search]);
  const activeCount = team.filter(s => s.isActive).length;
  const selected = team.find(s => String(s.id) === selectedId);
  const isCurrent = selectedId && String(current?.executiveId) === selectedId;
  const canSubmit = selected?.isActive && !isCurrent && !busy;
  return <Modal title={current ? `Reassign order #${order.id}` : `Assign order #${order.id}`}
    subtitle="Select an active delivery executive, then confirm the assignment."
    size="wide" closeDisabled={busy} onClose={onClose}>
    <div className="nx53-assignment-dialog">
      <div className="nx53-assignment-context">
        <div><span>ORDER</span><strong>#{order.id}</strong></div>
        <div><span>DELIVER TO</span><strong>{order.customerName || 'Customer'}</strong><small>{order.address?.city || 'Address on order'}</small></div>
        <div><span>EXECUTIVES</span><strong>{activeCount} active</strong><small>{team.length} total</small></div>
      </div>
      {current && <p className="nx53-current-assignee">Currently assigned to <strong>{current.executiveName}</strong>. You can reassign only before delivery starts.</p>}
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <label className="nx53-staff-search" htmlFor="nx53-staff-filter">
        <UiIcon name="search" size={19}/>
        <input id="nx53-staff-filter" type="search" autoComplete="off" placeholder="Search by name, mobile or email" value={search} onChange={e => setSearch(e.target.value)}/>
      </label>
      <div className="nx53-team-list" role="radiogroup" aria-label="Available delivery executives">
        {filtered.length === 0 ? <p className="nx53-team-empty">{team.length === 0 ? 'No delivery executives yet. Create an active delivery account first.' : 'No executives match your search.'}</p> :
          filtered.map(person => {
            const chosen = selectedId === String(person.id);
            return <label key={person.id} className={`nx53-team-card${chosen ? ' is-selected' : ''}${!person.isActive ? ' is-disabled' : ''}`}>
              <input type="radio" name="executive-for-order" value={person.id} checked={chosen} disabled={!person.isActive || busy}
                onChange={() => setSelectedId(String(person.id))}/>
              <span className="nx53-team-avatar" aria-hidden="true">{String(person.fullName || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>
              <span className="nx53-team-identity"><strong>{person.fullName}</strong><small>{person.mobile || 'No phone'} · {person.email || 'No email'}</small></span>
              <span className="nx53-team-meta"><em className={person.isActive ? 'is-active' : 'is-inactive'}>{person.isActive ? 'Active' : 'Disabled'}</em><small>{person.openDeliveries} open {person.openDeliveries === 1 ? 'delivery' : 'deliveries'}</small></span>
            </label>;
          })}
      </div>
      <div className="nx53-picker-footer">
        <p>{selected?.isActive ? (isCurrent ? 'This executive is already assigned.' : `Selected: ${selected.fullName}`) : (activeCount ? 'Choose an executive from the list.' : 'No active executives. Enable an account in Delivery team or add a new person.')}</p>
        <div><button type="button" className="nx53-cancel" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="button" className="nx53-confirm" disabled={!canSubmit} onClick={() => onAssign(selectedId)}>{busy ? 'Assigning…' : current ? 'Confirm reassignment' : 'Confirm assignment'}</button>
        </div>
      </div>
    </div>
  </Modal>;
}
