import { SearchInput } from "../ui/index";
import {useMemo,useState} from 'react';
import Modal from '../common/Modal';
import UiIcon from '../common/UiIcon';
import {deliveryTeamWithWorkload,filterDeliveryTeam} from '../../services/deliveryAssignmentView';

/** Multiple orders, one executive. This is deliberately a two-step confirmation. */
export default function DeliveryBatchAssignmentDialog({orders,staff,assignments,busy,error,onAssign,onClose}){
 const [search,setSearch]=useState('');
 const [selectedId,setSelectedId]=useState('');
 const team=useMemo(()=>deliveryTeamWithWorkload(staff,assignments),[staff,assignments]);
 const visible=useMemo(()=>filterDeliveryTeam(team,search),[team,search]);
 const chosen=team.find(person=>String(person.id)===selectedId && person.isActive);
 return <Modal title="Assign multiple deliveries" subtitle="One executive can manage many orders. Review the selected orders before confirming." size="wide" closeDisabled={busy} onClose={onClose}>
  <div className="nx55-batch-modal">
   <div className="nx55-batch-summary"><strong>{orders.length} selected orders</strong><span>Assignments will be saved together. If one order is no longer eligible, none will be assigned.</span></div>
   <div className="nx55-order-chips" aria-label="Orders in assignment batch">{orders.map(o=><span key={o.id}>#{o.id} · {o.customerName||'Customer'}{o.address?.city?` · ${o.address.city}`:''}</span>)}</div>
   {error&&<p className="admin-alert" role="alert">{error}</p>}
   <label className="nx55-batch-search"><UiIcon name="search" size={17}/><SearchInput placeholder="Search delivery team by name, email or phone" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <div className="nx55-team-list" role="radiogroup" aria-label="Choose executive for selected orders">
    {visible.length===0?<p>No delivery executives match your search.</p>:visible.map(person=><label key={person.id} className={`nx55-team-option${selectedId===String(person.id)?' is-selected':''}${!person.isActive?' is-disabled':''}`}>
     <input type="radio" name="batch-executive" checked={selectedId===String(person.id)} onChange={()=>setSelectedId(String(person.id))} disabled={!person.isActive||busy}/>
     <span className="nx55-team-avatar" aria-hidden="true">{String(person.fullName||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span>
     <span className="nx55-team-main"><strong>{person.fullName}</strong><small>{person.mobile||person.email||'Delivery executive'}</small></span>
     <span className="nx55-team-load"><strong>{person.openDeliveries} open</strong><small>{person.isActive?'Active':'Disabled'}</small></span>
    </label>)}
   </div>
   <div className="nx55-batch-footer"><p>{chosen?`After assignment, ${chosen.fullName} will have ${chosen.openDeliveries+orders.length} open deliveries.`:'Select an active executive to continue.'}</p><div><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="nx55-confirm" disabled={busy||!chosen} onClick={()=>onAssign(chosen.id)}>{busy?'Assigning…':`Assign ${orders.length} orders`}</button></div></div>
  </div>
 </Modal>;
}
