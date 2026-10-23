import {useEffect,useState} from 'react';
import {getMyEarnings,getAdminEarnings,getAdminCollections,recordDeliveryPayout} from '../../services/deliveryService';
import Modal from '../common/Modal';
const money=v=>`₹${Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const paise=v=>money(Number(v||0)/100);
const day=v=>v?new Date(v).toLocaleDateString('en-IN'):'—';
const thisMonth=()=>new Date().toLocaleDateString('en-CA').slice(0,7);
function presetBounds(value){const now=new Date(),dayStr=d=>d.toLocaleDateString('en-CA');if(value==='all')return {from:'',to:''};
 if(value==='month')return {from:`${thisMonth()}-01`,to:dayStr(now)};
 if(value==='week'||value==='30'){const past=new Date(now);past.setDate(now.getDate()-(value==='week'?6:29));return {from:dayStr(past),to:dayStr(now)};}
 return null;}
/** One reporting component for both Admin and Delivery, with role-appropriate access. */
export default function EarningsLedger({admin=false,staff=[]}){
 const [period,setPeriod]=useState('month'),[range,setRange]=useState(()=>presetBounds('month'));
 const [executiveId,setExecutiveId]=useState('');
 const [earnings,setEarnings]=useState(null),[collections,setCollections]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [payOrder,setPayOrder]=useState(null),[reference,setReference]=useState(''),[payBusy,setPayBusy]=useState(false),[refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');
 const r={...range,executiveId};
 Promise.all([admin?getAdminEarnings(r,c.signal):getMyEarnings(r,c.signal),admin?getAdminCollections(range,c.signal):Promise.resolve(null)])
 .then(([a,b])=>{if(!c.signal.aborted){setEarnings(a);setCollections(b);}})
 .catch(e=>{if(!c.signal.aborted)setError(e.message)})
 .finally(()=>{if(!c.signal.aborted)setLoading(false)});
 return()=>c.abort();},[admin,range.from,range.to,executiveId,refreshKey]);
 async function payout(event){event.preventDefault();if(!payOrder||reference.trim().length<3)return;setPayBusy(true);setError('');
 try{await recordDeliveryPayout(payOrder.orderId,reference.trim());setPayOrder(null);setReference('');setRefreshKey(x=>x+1);}
 catch(e){setError(e.message);}finally{setPayBusy(false);}}
 const s=earnings?.summary||{};const c=collections?.summary||{};
 return <section className="nx81-finance" id={admin?'nx81-admin-finance':'nx81-my-earnings'}>
 <div className="nx81-finance-head"><div><span className="nx52-eyebrow">{admin?'OPERATIONS & COLLECTIONS':'PAY & DELIVERY HISTORY'}</span><h2>{admin?'Store collections and delivery payouts':'My delivery earnings'}</h2><p>{admin?'COD collections, verified online payments, refunds and executive pay are kept separate.':'Track completed jobs, pending earnings and recorded payments for any period.'}</p></div>
 <div className="nx81-finance-filters"><label>Period<select aria-label="Earnings period" value={period} onChange={e=>{setPeriod(e.target.value);const next=presetBounds(e.target.value);if(next)setRange(next);}}><option value="month">This month</option><option value="week">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option><option value="custom">Custom range</option></select></label>
 <label>From<input type="date" aria-label="Earnings from" value={range.from} onChange={e=>{setPeriod('custom');setRange(x=>({...x,from:e.target.value}))}}/></label>
 <label>To<input type="date" aria-label="Earnings to" value={range.to} onChange={e=>{setPeriod('custom');setRange(x=>({...x,to:e.target.value}))}}/></label>
 {admin&&<label>Executive<select aria-label="Filter earnings executive" value={executiveId} onChange={e=>setExecutiveId(e.target.value)}><option value="">All executives</option>{staff.map(s=><option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>}</div></div>
 {error&&<p className="nx52-delivery-warning" role="alert">{error}</p>}
 {loading?<p role="status">Loading financial records…</p>:<>
 <div className="nx81-finance-cards"><article className="is-purple"><span>Earned from deliveries</span><strong>{paise(s.earnedPaise)}</strong><small>{s.completed||0} delivered</small></article><article className="is-green"><span>Payouts recorded</span><strong>{paise(s.paidPaise)}</strong><small>Paid separately from COD</small></article><article className="is-gold"><span>Awaiting payout</span><strong>{paise(s.unpaidPaise)}</strong><small>Not yet marked paid</small></article><article className="is-blue"><span>Still assigned</span><strong>{s.pending||0}</strong><small>Not yet earned</small></article></div>
 {admin&&<><h3 className="nx81-finance-section-heading">Store order receipts (not profit)</h3><div className="nx81-finance-cards"><article className="is-blue"><span>Gross order value</span><strong>{money(c.gross_orders)}</strong><small>{c.order_count||0} orders placed</small></article><article className="is-green"><span>COD collected</span><strong>{money(c.cod_collected)}</strong><small>COD orders {money(c.cod_orders)}</small></article><article className="is-purple"><span>Online payments verified</span><strong>{money(c.prepaid_verified)}</strong><small>Prepaid orders {money(c.prepaid_orders)}</small></article><article className="is-gold"><span>COD not recorded</span><strong>{money(c.cod_uncollected)}</strong><small>Refunded order value {money(c.refunded_value)}</small></article></div><p className="nx81-report-note">The above figures are gross sales / recorded collections, not business profit. Refunds, cost of goods, tax, fulfilment costs and executive payouts require separate reconciliation. Order date determines the reporting period.</p><div className="nx81-table-scroll"><table className="nx46-table"><thead><tr><th>Order</th><th>Placed</th><th>Payment method</th><th>Payment state</th><th>Refund</th><th>Order value</th></tr></thead><tbody>{(collections?.rows||[]).map(o=><tr key={o.id}><td>#{o.id}</td><td>{day(o.placedAt)}</td><td>{o.paymentMethod==='cod'?'Cash on delivery':'Online'}</td><td>{String(o.paymentStatus).replaceAll('_',' ')}</td><td>{o.refundStatus||'—'}</td><td>{money(o.total)}</td></tr>)}</tbody></table></div>{collections?.limited&&<p className="nx81-report-note">Showing first 500 orders; narrow date range to see more.</p>}</>}
 <h3 className="nx81-finance-section-heading">Delivery earnings by order</h3><div className="nx81-table-scroll"><table className="nx46-table"><thead><tr><th>Order</th>{admin&&<th>Executive</th>}<th>Date</th><th>Delivery</th><th>Payment</th><th>Delivery rate</th><th>Executive payout</th>{admin&&<th>Action</th>}</tr></thead><tbody>{(earnings?.rows||[]).map(a=><tr key={a.orderId}><td>#{a.orderId}</td>{admin&&<td>{a.executiveName}</td>}<td>{day(a.deliveredAt||a.assignedAt)}</td><td>{a.deliveryStatus.replaceAll('_',' ')}</td><td>{a.paymentMethod==='cod'?'COD':'Prepaid'} · {a.paymentStatus.replaceAll('_',' ')}</td><td>{money(a.payRate)}</td><td>{a.deliveryStatus==='delivered'?(a.paidAt?`Paid · ${day(a.paidAt)}`:'Awaiting payout'):'Not earned'}</td>{admin&&<td>{a.deliveryStatus==='delivered'&&!a.paidAt?<button type="button" className="nx81-payout-button" onClick={()=>{setPayOrder(a);setReference('')}}>Record payout</button>:'—'}</td>}</tr>)}</tbody></table></div>
 {!earnings?.rows?.length&&<p>No delivery earnings in this period.</p>}{earnings?.limited&&<p className="nx81-report-note">Showing first 2,000 assignments. Narrow date range for accurate totals.</p>}
 {!admin&&<p className="nx81-report-note">A delivery earns its assigned rate only after successful customer OTP confirmation. These are recorded earnings, not a bank balance.</p>}
 </>}
 {admin&&payOrder&&<Modal title={`Record executive payout · #${payOrder.orderId}`} subtitle="This marks money you already paid outside Nexora; it does not initiate a bank transfer." size="small" closeDisabled={payBusy} onClose={()=>{if(!payBusy)setPayOrder(null)}}><form className="nx80-delivery-form" onSubmit={payout}><p>Pay <strong>{payOrder.executiveName}</strong>: <strong>{money(payOrder.payRate)}</strong>.</p><label>Transfer / payout reference <b className="nx80-required">*</b><input required minLength={3} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} placeholder="e.g. Bank transfer UTR or cash voucher"/></label><div className="nx46-modal-actions"><button type="button" onClick={()=>setPayOrder(null)} disabled={payBusy}>Cancel</button><button type="submit" disabled={payBusy||reference.trim().length<3}>{payBusy?'Saving…':'Confirm payout recorded'}</button></div></form></Modal>}
 </section>;
}
