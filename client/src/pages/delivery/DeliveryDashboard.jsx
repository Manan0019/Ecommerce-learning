import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/common/NotificationBell';
import UiIcon from '../../components/common/UiIcon';
import { logout } from '../../services/authService';
import { getDeliverySession, getMyAssignments, updateMyDelivery } from '../../services/deliveryService';
import { cleanPhone, deliveryNextAction, deliveryTabMatch, mapSearchUrl } from '../../services/deliveryViewRules';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits:2,maximumFractionDigits:2 })}`;
const dates = value => value ? new Date(value).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : 'Not yet';
const statuses = { assigned:'Assigned', out_for_delivery:'Out for delivery', delivered:'Delivered' };
const tabs = [ ['all','All deliveries'], ['ready','Assigned'], ['route','On the way'], ['delivered','Completed'] ];

export default function DeliveryDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessionProblem, setSessionProblem] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null);
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
  }), [assignments,tab,search]);
  const current = assignments.find(a => String(a.orderId) === String(selected));
  const counts = useMemo(() => ({
    all:assignments.length,
    ready:assignments.filter(a=>deliveryTabMatch(a,'ready')).length,
    route:assignments.filter(a=>deliveryTabMatch(a,'route')).length,
    delivered:assignments.filter(a=>deliveryTabMatch(a,'delivered')).length
  }), [assignments]);
  async function update(a, next) {
    setBusy(String(a.orderId));setError('');setNotice('');
    try {
      await updateMyDelivery(a.orderId, next);
      await refresh();
      setNotice(`Order #${a.orderId} updated to ${statuses[next]}.`);
      setConfirmOrder(null);
      window.dispatchEvent(new Event('nexora:orders-updated'));
    } catch (e) {
      setError(e.message);
    } finally {setBusy('');}
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
        {phone && <a href={`tel:${phone}`}>Call customer <UiIcon name="up-right" size={15}/></a>}
        {maps && <a href={maps} target="_blank" rel="noopener noreferrer">Open in Maps <UiIcon name="up-right" size={15}/></a>}
      </div></div>
      <div className="nx52-order-finance"><span>Total <strong>{money(a.total)}</strong></span><span>Payment <strong>{a.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid online'}</strong></span><span>Order <strong>{a.orderStatus?.replaceAll('_',' ')}</strong></span></div>
      <ol className="nx52-delivery-timeline"><li className="is-complete"><span>Assigned</span><small>{dates(a.assignedAt)}</small></li><li className={a.outForDeliveryAt?'is-complete':''}><span>Out for delivery</span><small>{dates(a.outForDeliveryAt)}</small></li><li className={a.deliveredAt?'is-complete':''}><span>Delivered</span><small>{dates(a.deliveredAt)}</small></li></ol>
      {a.paymentMethod === 'cod' && <p className="nx52-cod-reminder">COD cash collection is recorded separately by the administrator. Marking delivery complete does not record a payment.</p>}
      {action ? <button className="nx52-action-primary" type="button" disabled={!!busy} onClick={()=>action.status==='delivered'?setConfirmOrder(a):update(a,action.status)}>{busy === String(a.orderId) ? 'Updating…' : action.label}<UiIcon name="right" size={17}/></button>
        : <p className="nx52-action-help">{a.deliveryStatus === 'delivered' ? 'Delivery complete.' : 'Awaiting admin dispatch. Delivery actions unlock after dispatch.'}</p>}
    </>;
  }
  return <div className="nx52-delivery-shell">
    <header className="nx52-delivery-header"><Link to="/delivery/dashboard" className="nx52-delivery-brand"><span className="nx52-brand-mark">N</span><span><strong>Nexora</strong><small>DELIVERY OPERATIONS</small></span></Link>
      <div className="nx52-delivery-account"><NotificationBell/><div className="nx52-delivery-user"><strong>{me?.fullName || 'Delivery executive'}</strong><small>{me?.email || 'Delivery workspace'}</small></div><button type="button" onClick={signOut}>Sign out</button></div></header>
    <main className="nx52-delivery-main"><div className="nx52-delivery-welcome"><div><p className="nx52-eyebrow">NEXORA · DELIVERY DESK</p><h1>Your delivery workspace</h1><span>View assigned orders, plan your route and update delivery progress.</span></div><button type="button" disabled={loading || !me} onClick={()=>{setError('');refresh().catch(e=>setError(e.message));}}><UiIcon name="right" size={16}/> Refresh</button></div>
      {error && <div className="nx52-delivery-warning" role="alert">{error}{sessionProblem && <Link to="/delivery/login">Go to delivery sign in <UiIcon name="right" size={15}/></Link>}</div>}
      {notice && <div className="nx52-delivery-success" role="status">{notice}</div>}
      {loading ? <div className="nx52-delivery-loading" role="status">Checking your delivery account and loading assignments…</div>
        : me && <>
          <section className="nx52-delivery-stats" aria-label="Delivery overview">
            <article><span>Assigned to you</span><strong>{counts.all}</strong><small>Across all statuses</small></article>
            <article><span>Ready to deliver</span><strong>{counts.ready}</strong><small>Awaiting dispatch or pickup</small></article>
            <article><span>On the way</span><strong>{counts.route}</strong><small>Active deliveries</small></article>
            <article><span>Completed</span><strong>{counts.delivered}</strong><small>Delivered orders</small></article>
          </section>
          <section className="nx52-delivery-work"><div className="nx52-delivery-work-top"><div><p className="nx52-eyebrow">MY ROUTE</p><h2>Assignments</h2></div><label className="nx52-delivery-search"><UiIcon name="search" size={18}/><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, name or city"/></label></div>
            <div className="nx52-delivery-tabs" role="group" aria-label="Filter deliveries">{tabs.map(([key,label])=><button type="button" key={key} className={tab===key?'is-active':''} aria-pressed={tab===key} onClick={()=>setTab(key)}>{label}<span>{counts[key]}</span></button>)}</div>
            <div className="nx52-delivery-content"><div className="nx52-delivery-list">{filtered.map(a=><button type="button" key={a.orderId} className={`nx52-delivery-list-card${String(selected || filtered[0]?.orderId)===String(a.orderId)?' is-active':''}`} onClick={()=>setSelected(a.orderId)}>
              <span><strong>Order #{a.orderId}</strong><small>{a.address?.city || 'Delivery'}</small></span><span className={`nx52-delivery-status is-${a.deliveryStatus}`}>{statuses[a.deliveryStatus] || a.deliveryStatus}</span><b>{a.customerName}</b><small>{money(a.total)} · {a.paymentMethod === 'cod' ? 'COD' : 'Online'}</small>
            </button>)}{!filtered.length && <div className="nx52-delivery-empty">{assignments.length?'No deliveries match this filter.':'No deliveries assigned yet. Your administrator can assign eligible orders in Delivery Executives.'}</div>}</div>
            <aside className="nx52-delivery-detail" aria-label="Selected delivery details">{(current && filtered.some(a=>String(a.orderId)===String(current.orderId)) ? current : filtered[0]) ? details(current && filtered.some(a=>String(a.orderId)===String(current.orderId)) ? current : filtered[0]) : <div className="nx52-detail-empty">Select an assignment to view delivery details.</div>}</aside></div>
          </section>
        </>}
    </main>
    {confirmOrder && <div className="nx52-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmOrder(null);}}>
      <section className="nx52-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="nx52-confirm-title">
        <span className="nx52-eyebrow">DELIVERY CONFIRMATION</span>
        <h2 id="nx52-confirm-title">Mark order #{confirmOrder.orderId} delivered?</h2>
        <p>Only confirm after handing the order to the recipient. This updates both the customer and the admin. COD payment collection remains an admin action.</p>
        <div className="nx52-confirm-actions"><button type="button" disabled={!!busy} onClick={()=>setConfirmOrder(null)}>Go back</button><button type="button" disabled={!!busy} onClick={()=>update(confirmOrder,'delivered')}>{busy?'Updating…':'Confirm delivery'}</button></div>
      </section>
    </div>}
  </div>;
}
