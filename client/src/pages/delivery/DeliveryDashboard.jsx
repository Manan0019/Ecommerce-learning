import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/common/NotificationBell';
import EarningsLedger from '../../components/delivery/EarningsLedger';
import UiIcon from '../../components/common/UiIcon';
import Modal from '../../components/common/Modal';
import {validateDeliveryForm,deliveryFieldError} from '../../services/deliveryAccountValidation';
import { logout } from '../../services/authService';
import { getDeliverySession, updateMyDeliveryProfile, getMyAssignments, updateMyDelivery, reportDeliveryIssue, resendDeliveryCode, confirmDeliveryCode } from '../../services/deliveryService';
import { cleanPhone, deliveryNextAction, deliveryTabMatch, deliveryAttentionPriority, mapSearchUrl } from '../../services/deliveryViewRules';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits:2,maximumFractionDigits:2 })}`;
const dates = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Not yet';
const statuses = { assigned:'Assigned', out_for_delivery:'Out for delivery', delivered:'Delivered' };
const initialIssue = {kind:'failed_attempt',reason:'',requestedDate:''};
const tabs = [ ['all','All deliveries'], ['active','In progress'], ['ready','Assigned'], ['route','On the way'], ['delivered','Completed'] ];

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [profile,setProfile]=useState(null);
  const [profileErrors,setProfileErrors]=useState({});
  const [profileBusy,setProfileBusy]=useState(false);
  const [assignments, setAssignments] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page,setPage]=useState(1);
  const [view,setView]=useState('table');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessionProblem, setSessionProblem] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null);
  const [deliveryOtp,setDeliveryOtp] = useState('');
  const [issueOrder,setIssueOrder] = useState(null);
  const [issueForm,setIssueForm] = useState(initialIssue);
  const refresh = useCallback(async (signal) => {
    const response = await getMyAssignments(signal);
    if (!signal?.aborted) setAssignments(response.assignments || []);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getDeliverySession(controller.signal),getMyAssignments(controller.signal)])
      .then(([session, data]) => {
        if (controller.signal.aborted) return;
        setMe(session.user);setAssignments(data.assignments || []);
        setSessionProblem(false);
      })
      .catch(e => {
        if (controller.signal.aborted) return;
        setError(e.status === 401 || e.status === 403 ? 'Your delivery session is unavailable or the account is disabled. Sign in with an active delivery account.' : e.message);
        setSessionProblem([401, 403].includes(e.status));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  const filtered = useMemo(() => assignments.filter(a => {
    const q = search.trim().toLocaleLowerCase();
    return deliveryTabMatch(a, tab) && (!q || String(a.orderId).includes(q) || a.customerName?.toLocaleLowerCase().includes(q) || a.address?.city?.toLocaleLowerCase().includes(q));
  }).sort((a, b) => deliveryAttentionPriority(a) - deliveryAttentionPriority(b) || Number(b.orderId) - Number(a.orderId)), [assignments,tab,search]);
  const perPage=12;
  const pages=Math.max(1,Math.ceil(filtered.length/perPage));
  const visible=filtered.slice((Math.min(page,pages)-1)*perPage,Math.min(page,pages)*perPage);
  const current = assignments.find(a => String(a.orderId) === String(selected));
  const counts = useMemo(() => ({
    all:assignments.length,
    active:assignments.filter(a=>deliveryTabMatch(a,'active')).length,
    ready:assignments.filter(a=>deliveryTabMatch(a,'ready')).length,
    route:assignments.filter(a=>deliveryTabMatch(a,'route')).length,
    delivered:assignments.filter(a=>deliveryTabMatch(a,'delivered')).length
  }), [assignments]);
  const actionable = assignments.filter(a => deliveryNextAction(a) && !a.pendingIssue);
  function focusNextDelivery() {
    const next = [...actionable].sort((a,b) => deliveryAttentionPriority(a) - deliveryAttentionPriority(b))[0];
    if (next) { setTab('active'); setSearch(''); setSelected(next.orderId); }
  }
  async function update(a, next) {
    setBusy(String(a.orderId));setError('');setNotice('');
    try {
      const response=await updateMyDelivery(a.orderId, next);
      await refresh();
      setNotice(response.otpSent===false ? (response.message||'Delivery status updated, but the OTP email could not be delivered. Use Resend code.') :
        next==='out_for_delivery' ? `Order #${a.orderId} is out for delivery. Verification code emailed to ${response.customerEmailMasked||'the customer'}.` :
        `Order #${a.orderId} updated to ${statuses[next]}.`);
      setConfirmOrder(null);
      window.dispatchEvent(new Event('nexora:orders-updated'));
    } catch (e) {
      setError(e.message);
    } finally {setBusy('');}
  }
  async function verifyHandover(event){
    event.preventDefault();if(!confirmOrder||!/^\d{6}$/.test(deliveryOtp))return;
    const target=confirmOrder;setBusy(String(target.orderId));setError('');setNotice('');
    try{await confirmDeliveryCode(target.orderId,deliveryOtp);await refresh();setConfirmOrder(null);setDeliveryOtp('');
      setNotice(`Order #${target.orderId} delivered. Customer verification completed.`);
      window.dispatchEvent(new Event('nexora:orders-updated'));
    }catch(e){setError(e.message);}finally{setBusy('');}
  }
  async function resendHandoverCode(a){
    setBusy(String(a.orderId));setError('');setNotice('');
    try{const response=await resendDeliveryCode(a.orderId);setNotice(response.otpSent ? `New code sent to ${response.customerEmailMasked || a.customerEmailMasked}.` : response.message || 'Email sending is pending.');}
    catch(e){setError(e.message);}finally{setBusy('');}
  }
  async function submitIssue(event){
    event.preventDefault();if(!issueOrder)return;
    setBusy(String(issueOrder.orderId));setError('');setNotice('');
    try{
      await reportDeliveryIssue(issueOrder.orderId,{kind:issueForm.kind,reason:issueForm.reason.trim(),
        requestedDate:issueForm.kind==='reschedule_requested'?issueForm.requestedDate:null});
      await refresh();setIssueOrder(null);setIssueForm({...initialIssue});
      setNotice(`Issue reported for order #${issueOrder.orderId}. Await admin review before another delivery attempt.`);
    }catch(e){setError(e.message);}finally{setBusy('');}
  }
  function openProfile(){if(me){setProfile({fullName:me.fullName||'',mobileNumber:me.mobileNumber||''});setProfileErrors({});setError('');}}
  async function saveProfile(e){
    e.preventDefault();const errors=validateDeliveryForm(profile,{profile:true});setProfileErrors(errors);
    if(Object.keys(errors).length)return;
    setProfileBusy(true);setError('');
    try{const response=await updateMyDeliveryProfile(profile);setMe(previous=>({...previous,...response.user}));setProfile(null);window.dispatchEvent(new Event('nexora:changes-saved'));setNotice('Your contact profile has been updated.');}
    catch(ex){if(ex.data?.errors)setProfileErrors(ex.data.errors);else setError(ex.message);}finally{setProfileBusy(false);}
  }
  async function signOut() {
    try {await logout();navigate('/delivery/login', {replace:true});}
    catch(e) {setError(e.message);}
  }
  function details(a) {
    const action = deliveryNextAction(a);
    const phone = cleanPhone(a.customerPhone || a.address?.phone);
    const address = [a.address?.addressLine1,a.address?.addressLine2,a.address?.city,a.address?.state,a.address?.pincode].filter(Boolean).join(', ');
    const maps = mapSearchUrl(a.address);
    return <>
      <div className="nx52-order-head"><div><small>ORDER #{a.orderId}</small><h3>{a.customerName}</h3></div><span className={`nx52-delivery-status is-${a.deliveryStatus}`}>{statuses[a.deliveryStatus] || a.deliveryStatus}</span></div>
      <div className="nx52-delivery-address"><strong>Delivery address</strong><p>{address || 'Address unavailable'}</p><div className="nx52-contact-actions">
        {phone && <a href={`tel:${phone}`}>Call customer <UiIcon name="chevron-right" size={15}/></a>}
        {maps && <a href={maps} target="_blank" rel="noopener noreferrer">Open in Maps <UiIcon name="chevron-right" size={15}/></a>}
      </div></div>
      <div className="nx52-order-finance"><span>Total <strong>{money(a.total)}</strong></span><span>Payment <strong>{a.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</strong></span><span>Order <strong>{a.orderStatus?.replaceAll('_',' ')}</strong></span></div>
      <ol className="nx52-delivery-timeline"><li className="is-complete"><span>Assigned</span><small>{dates(a.assignedAt)}</small></li><li className={a.outForDeliveryAt?'is-complete':''}><span>Out for delivery</span><small>{dates(a.outForDeliveryAt)}</small></li><li className={a.deliveredAt?'is-complete':''}><span>Delivered</span><small>{dates(a.deliveredAt)}</small></li></ol>
      {a.pendingIssue && <div className="nx54-issue-waiting" role="status"><strong>Awaiting admin review</strong>
        <p>{a.pendingIssue.kind==='reschedule_requested'?'Delivery rescheduling requested':'Unsuccessful delivery attempt'} · {a.pendingIssue.reason}</p>
        {a.pendingIssue.requestedDate&&<small>Requested date: {String(a.pendingIssue.requestedDate).slice(0,10)}</small>}
      </div>}
      {a.paymentMethod === 'cod' && <p className="nx52-cod-reminder">COD cash collection is recorded separately by the administrator. Marking delivery complete does not record a payment.</p>}
      {!a.pendingIssue&&a.deliveryStatus==='out_for_delivery'&&a.orderStatus==='shipped'&&<div className="nx58-code-handover"><span>Customer delivery confirmation is required. Code sent to <strong>{a.customerEmailMasked || 'registered email'}</strong>.</span>
        <button type="button" disabled={!!busy} onClick={()=>resendHandoverCode(a)}>Resend code</button></div>}
      {!a.pendingIssue&&a.deliveryStatus==='out_for_delivery'&&a.orderStatus==='shipped'&&<button type="button" className="nx54-report-action" disabled={!!busy} onClick={()=>{setError('');setIssueOrder(a);setIssueForm({...initialIssue});}}>Report delivery issue</button>}
      {a.pendingIssue ? <p className="nx52-action-help">Delivery is paused until your administrator reviews this report.</p> : action ? <button className="nx52-action-primary" type="button" disabled={!!busy} onClick={()=>action.status==='delivered'?(setDeliveryOtp(''),setConfirmOrder(a)):update(a,action.status)}>{busy === String(a.orderId) ? 'Updating…' : action.status==='delivered' ? 'Verify OTP & deliver' : action.label}<UiIcon name="right" size={17}/></button>
        : <p className="nx52-action-help">{a.deliveryStatus === 'delivered' ? 'Delivery complete.' : 'Awaiting admin dispatch. Delivery actions unlock after dispatch.'}</p>}
    </>;
  }
  return <div className="nx52-delivery-shell nx57-delivery-shell nx82-delivery-shell">
    <aside className="nx57-delivery-sidebar nx82-delivery-sidebar" aria-label="Delivery workspace navigation">
      <Link to="/delivery/dashboard" className="nx57-delivery-logo"><span>N</span><strong>Nexora<small>DELIVERY OPERATIONS</small></strong></Link>
      <p className="nx57-sidebar-label">WORKSPACE</p>
      {[["all","Dashboard","layout-dashboard"],["active","In progress","truck"],["ready","Assigned orders","package"],["route","Out for delivery","truck"],["delivered","Delivered history","check-circle"]].map(([key,label,icon])=><button type="button" key={key} className={tab===key?'is-active':''} onClick={()=>{setTab(key);setSelected(null);setPage(1)}} aria-current={tab===key?'page':undefined}><UiIcon name={icon} size={17}/><span>{label}</span><b>{counts[key]}</b></button>)}
      <div className="nx57-delivery-sidebar-foot"><button className="nx80-edit-profile" type="button" onClick={openProfile}><UiIcon name="edit" size={16}/> Edit profile</button><span>{me?.fullName||'Delivery executive'}</span><small>{me?.email||'Assigned deliveries only'}</small><button type="button" onClick={signOut}>Sign out <UiIcon name="right" size={16}/></button></div>
    </aside>
    <header className="nx52-delivery-header"><Link to="/delivery/dashboard" className="nx52-delivery-brand"><span className="nx52-brand-mark">N</span><span><strong>Nexora</strong><small>DELIVERY OPERATIONS</small></span></Link>
      <div className="nx52-delivery-account"><NotificationBell/><button type="button" className="nx80-header-profile" onClick={openProfile}><UiIcon name="edit" size={16}/> Edit profile</button><div className="nx52-delivery-user"><strong>{me?.fullName || 'Delivery executive'}</strong><small>{me?.email || 'Delivery workspace'}</small></div><button type="button" onClick={signOut}>Sign out</button></div></header>
    <main className="nx52-delivery-main nx82-delivery-main"><section className="nx82-delivery-hero" aria-label="Delivery command centre"><div className="nx82-delivery-hero-copy">
    <p className="nx82-kicker"><span className="nx82-online-dot"/> NEXORA · DELIVERY COMMAND CENTRE</p>
    <h1>{me ? `Good to see you, ${me.fullName?.trim().split(/\s+/)[0]||'partner'}.` : 'Your delivery workspace.'}</h1>
    <p>One place for every handover, live assignment, customer contact and earning record. Finish each order with verified delivery.</p>
    <div className="nx82-hero-chips"><span><UiIcon name="package" size={15}/> {counts.ready} ready to start</span><span><UiIcon name="truck" size={15}/> {counts.route} on the road</span><span><UiIcon name="check-circle" size={15}/> {counts.delivered} completed</span></div>
   </div><div className="nx82-delivery-hero-progress"><span>DELIVERY COMPLETION</span><strong>{counts.all ? Math.round(counts.delivered/counts.all*100):0}%</strong>
     <div className="nx82-progress-track" role="progressbar" aria-valuenow={counts.all ? Math.round(counts.delivered/counts.all*100):0} aria-valuemin="0" aria-valuemax="100" aria-label="Overall assignment completion"><i style={{width:`${counts.all ? Math.round(counts.delivered/counts.all*100):0}%`}}/></div>
     <small>{counts.delivered} of {counts.all} assigned orders completed</small>
     <button type="button" disabled={loading || !me} onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}><UiIcon name="refresh-cw" size={16}/> Refresh assignments</button>
   </div></section>
      {error && <div className="nx52-delivery-warning" role="alert">{error}{sessionProblem && <Link to="/delivery/login">Go to delivery sign in <UiIcon name="right" size={15}/></Link>}</div>}
      {notice && <div className="nx52-delivery-success" role="status">{notice}</div>}
      {loading ? <div className="nx52-delivery-loading" role="status">Checking your delivery account and loading assignments…</div>
        : me && <>
          <section className="nx52-delivery-stats nx82-delivery-stats" aria-label="Delivery overview">
            <article><span>Assigned to you</span><strong>{counts.all}</strong><small>Across all statuses</small></article>
            <article><span>Ready to deliver</span><strong>{counts.ready}</strong><small>Awaiting dispatch or pickup</small></article>
            <article><span>On the way</span><strong>{counts.route}</strong><small>Active deliveries</small></article>
            <article><span>Completed</span><strong>{counts.delivered}</strong><small>Delivered orders</small></article>
            <article><span>Rate for new deliveries</span><strong>{money(me?.payRate)}</strong><small>Locked when assigned</small></article>
          </section>
          <div className="nx82-earnings-wrapper"><div className="nx82-section-prelude"><div><p>PERSONAL PAY LEDGER</p><h2>Delivery earnings</h2></div><span>Pay confirmed only after verified handover</span></div><EarningsLedger /></div>
          <section className="nx74-delivery-queue-summary nx82-priority" aria-label="Delivery priorities">
            <div><span className="nx52-eyebrow">DELIVERY PRIORITIES</span><strong>{actionable.length ? `${actionable.length} order${actionable.length === 1 ? '' : 's'} ready for your action` : 'All actionable deliveries handled'}</strong><small>{actionable.length ? 'Open the next eligible assignment to begin or verify its delivery.' : 'New assignments will appear when your administrator dispatches them.'}</small></div>
            {actionable.length > 0 && <button type="button" onClick={focusNextDelivery}><UiIcon name="package" size={17}/>Open next delivery</button>}
          </section>
          <section className="nx52-delivery-work nx82-delivery-work"><div className="nx52-delivery-work-top"><div><p className="nx52-eyebrow">MY ROUTE</p><h2>My delivery queue</h2></div><label className="nx52-delivery-search"><UiIcon name="search" size={18}/><input type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search order, name or city"/></label></div>
            <div className="nx77-delivery-view-controls"><button type="button" aria-pressed={view==='table'} onClick={()=>setView('table')}><UiIcon name="list" size={16}/> Table view</button><button type="button" aria-pressed={view==='cards'} onClick={()=>setView('cards')}><UiIcon name="layout-grid" size={16}/> Cards</button></div>
            <div className="nx52-delivery-tabs" role="group" aria-label="Filter deliveries">{tabs.map(([key,label])=><button type="button" key={key} className={tab===key?'is-active':''} aria-pressed={tab===key} onClick={()=>{setTab(key);setPage(1);}}>{label}<span>{counts[key]}</span></button>)}</div>
            <p className="nx74-delivery-results" role="status">Showing {filtered.length} of {assignments.length} assignments · Unfinished deliveries appear first</p><div className="nx52-delivery-content"><div className="nx52-delivery-list">{view==='table'&&<div className="nx77-delivery-mini-table" role="table" aria-label="Delivery assignments"><div role="row" className="nx77-delivery-mini-head"><span>Order</span><span>Customer</span><span>Status</span></div>{visible.map(a=><button type="button" role="row" key={a.orderId} className={String(selected || filtered[0]?.orderId)===String(a.orderId)?'is-active':''} onClick={()=>setSelected(a.orderId)}><span>#{a.orderId}<small>{money(a.total)}</small></span><span>{a.customerName}<small>{a.address?.city||'—'}</small></span><span>{statuses[a.deliveryStatus]||a.deliveryStatus}</span></button>)}</div>}{view==='cards'&&visible.map(a=><button type="button" key={a.orderId} className={`nx52-delivery-list-card${String(selected || filtered[0]?.orderId)===String(a.orderId)?' is-active':''}`} onClick={()=>setSelected(a.orderId)}>
              <span><strong>Order #{a.orderId}</strong><small>{a.address?.city || 'Delivery'}</small></span><span className={`nx52-delivery-status is-${a.deliveryStatus}`}>{statuses[a.deliveryStatus] || a.deliveryStatus}</span><b>{a.customerName}</b><small>{money(a.total)} · {a.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}</small>
            </button>)}<div className="nx77-pagination"><span>{visible.length} shown · page {Math.min(page,pages)}/{pages}</span><button type="button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><button type="button" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button></div>{!filtered.length && <div className="nx52-delivery-empty">{assignments.length?'No deliveries match this filter.':'No deliveries assigned yet. Your administrator can assign eligible orders in Delivery Executives.'}</div>}</div>
            <aside className="nx52-delivery-detail" aria-label="Selected delivery details">{(current && visible.some(a=>String(a.orderId)===String(current.orderId)) ? current : visible[0]) ? details(current && visible.some(a=>String(a.orderId)===String(current.orderId)) ? current : visible[0]) : <div className="nx52-detail-empty">Select an assignment to view delivery details.</div>}</aside></div>
          </section>
        </>}
    </main>
    {profile&&<Modal title="Edit your profile" subtitle="Keep your delivery contact information accurate." size="small" closeDisabled={profileBusy} onClose={()=>{if(!profileBusy)setProfile(null);}}><form className="nx46-create-form nx80-delivery-form" onSubmit={saveProfile} noValidate>{[['fullName','Full name'],['mobileNumber','Mobile number']].map(([field,label])=><label key={field} htmlFor={`nx80-profile-${field}`}><span>{label} <b className="nx80-required" aria-hidden="true">*</b></span><input id={`nx80-profile-${field}`} type={field==='mobileNumber'?'tel':'text'} inputMode={field==='mobileNumber'?'numeric':undefined} maxLength={field==='mobileNumber'?10:100} pattern={field==='mobileNumber'?'[0-9]{10}':undefined} required value={profile[field]} aria-invalid={Boolean(profileErrors[field])} aria-describedby={profileErrors[field]?`nx80-profile-${field}-error`:undefined} onBlur={()=>setProfileErrors(e=>({...e,[field]:deliveryFieldError(field,profile[field])}))} onChange={e=>{const value=field==='mobileNumber'?e.target.value.replace(/\D/g,'').slice(0,10):e.target.value;setProfile(v=>({...v,[field]:value}));if(profileErrors[field])setProfileErrors(prev=>({...prev,[field]:deliveryFieldError(field,value)}));}}/>{profileErrors[field]&&<small id={`nx80-profile-${field}-error`} className="nx80-field-error" role="alert">{profileErrors[field]}</small>}</label>)}<p>Sign-in email: <strong>{me?.email}</strong> (contact your administrator to change this)</p><div className="nx46-modal-actions"><button type="button" disabled={profileBusy} onClick={()=>setProfile(null)}>Cancel</button><button type="submit" disabled={profileBusy}>{profileBusy?'Saving…':'Save changes'}</button></div></form></Modal>}
    {issueOrder && <div className="nx52-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setIssueOrder(null);}}>
      <form className="nx52-confirm-panel nx54-report-panel" role="dialog" aria-modal="true" aria-labelledby="nx54-report-title" onSubmit={submitIssue}>
        <span className="nx52-eyebrow">DELIVERY EXCEPTION</span><h2 id="nx54-report-title">Report issue · Order #{issueOrder.orderId}</h2>
        <p>Record what happened. This pauses completion until an administrator approves another delivery attempt; it does not cancel the order.</p>
        <label>Issue type<select value={issueForm.kind} disabled={!!busy} onChange={e=>setIssueForm(x=>({...x,kind:e.target.value,requestedDate:''}))}>
          <option value="failed_attempt">Delivery attempt unsuccessful</option><option value="reschedule_requested">Request a new delivery date</option>
        </select></label>
        {issueForm.kind==='reschedule_requested'&&<label>Proposed date (next 30 days)<input type="date" required disabled={!!busy}
          min={new Date().toLocaleDateString('en-CA')} value={issueForm.requestedDate}
          onChange={e=>setIssueForm(x=>({...x,requestedDate:e.target.value}))}/></label>}
        <label>Reason / delivery notes<textarea minLength={10} maxLength={300} required rows={4} disabled={!!busy}
          placeholder="E.g. customer unavailable after calling; please arrange another attempt."
          value={issueForm.reason} onChange={e=>setIssueForm(x=>({...x,reason:e.target.value}))}/></label>
        {error&&<p className="nx52-delivery-warning" role="alert">{error}</p>}
        <div className="nx52-confirm-actions"><button type="button" disabled={!!busy} onClick={()=>setIssueOrder(null)}>Go back</button>
          <button type="submit" disabled={!!busy||issueForm.reason.trim().length<10||issueForm.reason.trim().length>300||(issueForm.kind==='reschedule_requested'&&!issueForm.requestedDate)}>{busy?'Submitting…':'Send to admin'}</button></div>
      </form>
    </div>}
    {confirmOrder && <div className="nx52-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmOrder(null);}}>
      <form className="nx52-confirm-panel nx58-otp-dialog" role="dialog" aria-modal="true" aria-labelledby="nx52-confirm-title" onSubmit={verifyHandover}>
        <span className="nx52-eyebrow">SECURE HANDOVER</span>
        <h2 id="nx52-confirm-title">Verify delivery · Order #{confirmOrder.orderId}</h2>
        <p>Ask the recipient for the code sent to <strong>{confirmOrder.customerEmailMasked || 'their registered email'}</strong> only after handing over the parcel. Do not ask the customer to share it before delivery.</p>
        <label>Six-digit customer OTP<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required
          value={deliveryOtp} onChange={e=>setDeliveryOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit code" disabled={!!busy} /></label>
        {error&&<p className="nx52-delivery-warning" role="alert">{error}</p>}
        <div className="nx52-confirm-actions"><button type="button" disabled={!!busy} onClick={()=>{setConfirmOrder(null);setDeliveryOtp('');}}>Go back</button>
          <button type="button" disabled={!!busy} onClick={()=>resendHandoverCode(confirmOrder)}>Resend code</button>
          <button type="submit" disabled={!!busy||!/^\d{6}$/.test(deliveryOtp)}>{busy?'Verifying…':'Verify & mark delivered'}</button></div>
      </form>
    </div>}
  </div>;
}
