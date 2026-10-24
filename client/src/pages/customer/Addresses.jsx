import { Button, Checkbox, EmptyState, FormField, IconButton, TextField } from "../../components/ui/index";

import {useEffect,useState} from 'react';
import UiIcon from "../../components/common/UiIcon";
import {Link,useNavigate} from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import AddressFields from '../../components/customer/AddressFields';
import { blankAddress } from '../../constants/addressDefaults';
import {getAddresses,createAddress,updateAddress,deleteAddress,markDefaultAddress} from '../../services/addressService';
import {isAuthenticationError} from '../../services/apiClient';

export default function Addresses(){
 const navigate=useNavigate();const [addresses,setAddresses]=useState([]);const [draft,setDraft]=useState(null);
 const [editing,setEditing]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 async function refresh(){const d=await getAddresses();setAddresses(d.addresses||[]);}
 useEffect(()=>{const controller=new AbortController();getAddresses(controller.signal).then(d=>{if(!controller.signal.aborted)setAddresses(d.addresses||[])}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});return ()=>controller.abort()},[]);
 async function action(work){setBusy(true);setError('');try{await work();await refresh()}catch(e){if(isAuthenticationError(e))navigate('/login');else setError(e.message)}finally{setBusy(false)}}
 async function submit(event){event.preventDefault();await action(async()=>{if(editing)await updateAddress(editing,draft);else await createAddress(draft);setDraft(null);setEditing(null)});}
 return <CustomerLayout mainClassName="nx25-addresses-page"><div className="nx25-page-heading"><div><p className="eyebrow">Your account</p><h1>Saved addresses</h1><p>Manage your delivery addresses for a quicker checkout.</p></div><Button variant="primary"  type="button" onClick={()=>{setEditing(null);setDraft({...blankAddress})}} disabled={busy||addresses.length>=10}>+ Add address</Button></div>
 {error&&<p className="nx-cod-message nx-cod-error" role="alert">{error}</p>}
 {loading?<p>Loading addresses…</p>:<div className="nx25-address-grid">{addresses.map(a=><article key={a.id} className="nx25-address-card"><div className="nx25-address-top"><strong>{a.label||'Home'}</strong>{a.isDefault&&<span className="nx25-pill">Default</span>}</div><h2>{a.fullName}</h2><p>{a.addressLine1}{a.addressLine2?`, ${a.addressLine2}`:''}<br/>{a.city}, {a.state} — {a.pincode}<br/>{a.phone}</p><div className="nx25-address-actions"><IconButton variant="secondary"  title="Edit address" aria-label={`Edit address ${a.label||'Home'}`} disabled={busy} onClick={()=>{setEditing(a.id);setDraft({...a})}}><UiIcon name="edit" size={18}/></IconButton>{!a.isDefault&&<Button variant="secondary" disabled={busy} onClick={()=>action(()=>markDefaultAddress(a.id))}>Make default</Button>}<IconButton variant="danger"  title="Delete address" aria-label={`Delete address ${a.label||'Home'}`} disabled={busy} onClick={()=>{if(window.confirm(`Delete address for ${a.fullName}?`))action(()=>deleteAddress(a.id))}}><UiIcon name="trash" size={18}/></IconButton></div></article>)}
 {!loading&&!addresses.length&&<EmptyState icon="store" title="No addresses saved" description="Add your first delivery address to speed up checkout."/>}</div>}
 {draft&&<section className="nx-cod-panel nx25-address-editor"><h2>{editing?'Edit address':'New address'}</h2><form onSubmit={submit}><FormField className="nx-cod-field"><span>Address label *</span><TextField value={draft.label||'Home'} maxLength={30} required onChange={e=>setDraft(old=>({...old,label:e.target.value}))}/></FormField><AddressFields address={draft} onChange={setDraft} disabled={busy}/><FormField inline className="nx25-check"><Checkbox type="checkbox" checked={!!draft.isDefault} onChange={e=>setDraft(old=>({...old,isDefault:e.target.checked}))}/> Make this my default address</FormField><div className="nx25-actions"><Button variant="primary" disabled={busy} >{busy?'Saving…':'Save address'}</Button><Button variant="secondary" disabled={busy} type="button"  onClick={()=>{setDraft(null);setEditing(null)}}>Cancel</Button></div></form></section>}
 <p className="nx25-muted"><Link to="/checkout">Continue to checkout</Link></p></CustomerLayout>
}
