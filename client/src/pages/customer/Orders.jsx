import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import OrderTimeline from "../../components/customer/OrderTimeline";
import UiIcon from "../../components/common/UiIcon";
import OrderCancellationDialog from "../../components/customer/OrderCancellationDialog";
import { getMyOrders, reconcileRazorpayOrder, retryRazorpayCheckout, verifyRazorpayPayment, requestOrderCancellation } from "../../services/orderService";
import { isAuthenticationError, apiAssetUrl } from "../../services/apiClient";
import { loadRazorpayCheckout } from "../../services/razorpayCheckout";
import {useCart} from "../../hooks/useCart";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function OrderProductPreview({item}){
 return <div className="nx59-order-preview-item">
  <Link className="nx59-order-preview-image" to={`/products/${item.productId}`} aria-label={`View ${item.name}`}>
   {item.imageUrl?<img src={apiAssetUrl(item.imageUrl)} alt={item.name} loading="lazy" onError={e=>{e.currentTarget.style.display='none';e.currentTarget.nextElementSibling?.removeAttribute('hidden')}}/>:null}
   <span className="nx59-image-placeholder" hidden={Boolean(item.imageUrl)}><UiIcon name="package" size={26}/></span>
  </Link>
  <div className="nx59-order-preview-copy"><Link to={`/products/${item.productId}`}>{item.name}</Link>
    <span>{item.sku||'Standard'} · Qty {item.quantity}</span>
  </div>
  <strong className="nx59-order-preview-price">{money(item.lineTotal)}</strong>
 </div>;
}


export default function Orders(){
 const navigate=useNavigate(),location=useLocation(),{items:cartItems,clearCart}=useCart();
 const liveRevision=useRealtimeRevision(['orders', 'notifications']);
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''),[checkingId,setCheckingId]=useState('');
 const deepLinkedOrder=new URLSearchParams(location.search).get('order');
 const [expandedId,setExpandedId]=useState(deepLinkedOrder || location.state?.placedId || null);
 const [filter,setFilter]=useState("all"),[search,setSearch]=useState("");
 const [cancelOrder,setCancelOrder]=useState(null),[cancelBusy,setCancelBusy]=useState(false),[cancelError,setCancelError]=useState('');
 async function sendCancellation(reason){setCancelBusy(true);setCancelError('');try{
  await requestOrderCancellation(cancelOrder.id,reason);const updated=await getMyOrders();setOrders(updated.orders||[]);
  setSuccess(`Cancellation request sent for order #${cancelOrder.id}. Awaiting store review.`);setCancelOrder(null);
 }catch(e){setCancelError(e.message);}finally{setCancelBusy(false);}}
 async function checkPayment(id){setCheckingId(id);setError('');try{
  const result=await reconcileRazorpayOrder(id);
  const refreshed=await getMyOrders();setOrders(refreshed.orders||[]);
  if(result.needsReview)setError(`Payment #${id} requires manual store review.`);
 }catch(e){setError(e.message)}finally{setCheckingId('')}}
 async function retryPayment(order){
  setCheckingId(order.id);setError('');setSuccess('');
  let opened=false;
  const release=()=>setCheckingId('');
  try{
    await loadRazorpayCheckout();
    const result=await retryRazorpayCheckout(order.id);
    if(result.alreadyPaid){const refreshed=await getMyOrders();setOrders(refreshed.orders||[]);setSuccess(`Payment for #${order.id} is already verified.`);return;}
    const {payment,customer}=result;
    let handled=false;
    const checkout=new window.Razorpay({
      key:payment.keyId,order_id:payment.gatewayOrderId,amount:payment.amountPaise,currency:payment.currency,
      name:'Nexora',description:`Order #${order.id}`,theme:{color:'#6952c4'},
      prefill:{name:customer?.fullName||'',contact:customer?.phone||''},
      handler:async details=>{
        handled=true;
        try{
          const confirmed=await verifyRazorpayPayment({orderId:order.id,...details});
          const refreshed=await getMyOrders();setOrders(refreshed.orders||[]);
          if(confirmed.paid){
            const sameCart=cartItems.length===order.items.length&&cartItems.every(c=>order.items.some(x=>
              String(c.productId)===String(x.productId)&&String(c.variantId??'')===String(x.variantId??'')&&c.quantity===x.quantity));
            if(sameCart)clearCart();
            setSuccess(`✓ Order #${order.id}: Razorpay payment successfully captured and verified.`);
          }else setError('Payment is still processing. Use Check payment status before retrying.');
        }catch(e){setError(`Payment verification pending: ${e.message}. Use Check payment status.`)}finally{release()}
      },
      modal:{ondismiss:()=>{if(!handled){setError('Checkout closed. The order remains pending until the payment is verified.');release()}}},
    });
    checkout.on('payment.failed',()=>setError('Payment attempt failed. You may retry using this same order.'));
    checkout.open();opened=true;
  }catch(e){setError(e.message)}finally{if(!opened)release()}
 }
 useEffect(()=>{const controller=new AbortController();getMyOrders(controller.signal).then(d=>setOrders(d.orders||[])).catch(e=>{if(isAuthenticationError(e))navigate("/login",{replace:true,state:{from:"/orders"}});else if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[navigate,liveRevision]);
 useEffect(()=>{
  if(!deepLinkedOrder || !/^[1-9]\d*$/.test(deepLinkedOrder))return;
  setExpandedId(deepLinkedOrder);
  if(orders.some(o=>String(o.id)===deepLinkedOrder)){
   requestAnimationFrame(()=>document.getElementById(`nx-order-${deepLinkedOrder}`)?.scrollIntoView({block:'start',behavior:'smooth'}));
  }
 },[deepLinkedOrder,orders]);
 const visibleOrders=orders.filter(o=>{
   const matchFilter=String(o.id)===String(deepLinkedOrder) || filter==='all'||
     (filter==='active' && !['cancelled','delivered','payment_expired'].includes(o.status) && o.paymentStatus!=='razorpay_expired')||
     (filter==='delivered' && o.status==='delivered')||
     (filter==='cancelled' && (o.status==='cancelled'||o.paymentStatus==='razorpay_expired'))||
     (filter==='payment' && o.paymentMethod==='Razorpay' && ['razorpay_pending','razorpay_review'].includes(o.paymentStatus));
   const needle=search.trim().toLocaleLowerCase();
   return matchFilter && (!needle||String(o.id).includes(needle)||o.items.some(i=>String(i.name||'').toLocaleLowerCase().includes(needle)||String(i.sku||'').toLocaleLowerCase().includes(needle)));
 });
 return <CustomerLayout mainClassName="nx-orders-page nx60-orders-page"><div className="nx-page-intro"><p className="eyebrow">Your orders</p><h1>Follow every order</h1><p>Follow COD and Razorpay orders from payment confirmation through delivery.</p></div>
 {location.state?.placedId&&<div className="nx-cod-message nx-cod-success" role="status">✓ Order #{location.state.placedId} {location.state.alreadyPlaced?"was already placed":"was placed successfully"}. {location.state.paidOnline?"Razorpay payment captured and verified.":"Pay on delivery."}</div>}
 {error&&<div className="nx-cod-message nx-cod-error" role="alert">{error}</div>}
 {success&&<div className="nx-cod-message nx-cod-success" role="status">{success}</div>}
 {!loading && orders.length>0 && <div className="nx60-orders-toolbar"><div className="nx60-order-filters" role="group" aria-label="Filter orders">{[['all','All orders'],['active','In progress'],['delivered','Delivered'],['payment','Needs payment'],['cancelled','Cancelled / expired']].map(([key,label])=><button type="button" key={key} className={filter===key?'is-active':''} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div><label className="nx60-order-search"><UiIcon name="search" size={18}/><input type="search" placeholder="Find order or product" aria-label="Find order or product" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>}
 {loading?<p role="status">Loading orders…</p>:!orders.length?<div className="store-empty"><h2>No orders yet</h2><p>When you order, you can follow its progress here.</p><Link className="button button-primary" to="/products">Explore products</Link></div>:!visibleOrders.length?<div className="nx60-no-orders" role="status">No orders match these filters. <button type="button" onClick={()=>{setFilter("all");setSearch("")}}>Show all orders</button></div>:<div className="nx-orders-list nx59-orders-list">{visibleOrders.map(o=><article id={`nx-order-${o.id}`} className="nx-order-card nx38-customer-order nx59-customer-order nx68-order-reflect" key={o.id}>
   <div className="nx-order-heading nx59-order-heading"><div><small>ORDER #{o.id} · {new Date(o.placedAt).toLocaleDateString("en-IN")}</small><h2>{money(o.total)} <span className="nx38-item-count">· {o.items.length} item{o.items.length===1?"":"s"}</span></h2></div><div className="nx57-customer-status"><span className={`nx-status nx-status-${o.status}`}>{o.status.replaceAll('_',' ')}</span><button type="button" aria-expanded={String(expandedId)===String(o.id)} onClick={()=>setExpandedId(x=>String(x)===String(o.id)?null:o.id)}>{String(expandedId)===String(o.id)?'Hide details':'Track & manage'} <UiIcon name={String(expandedId)===String(o.id)?'chevron-down':'chevron-right'} size={15}/></button></div></div>
   <div className="nx59-customer-order-preview">{o.items.slice(0,3).map((item,i)=><OrderProductPreview key={`${item.productId}-${item.variantId||'base'}-${i}`} item={item}/>)}{o.items.length>3&&<button type="button" className="nx59-more-items" onClick={()=>setExpandedId(o.id)}>+{o.items.length-3} more products <UiIcon name="chevron-right" size={16}/></button>}</div>
   <div className="nx59-order-quick-info"><span><UiIcon name="truck" size={17}/> {o.paymentMethod==='Razorpay'?'Online payment':'Cash on delivery'}</span><span>{o.paymentMethod==='Razorpay'?(o.refundStatus==='processed'?'Refund completed':o.refundStatus?'Refund under review':o.paymentStatus==='razorpay_paid'?'Payment verified':'Payment awaiting confirmation'):(o.paymentStatus==='cod_collected'?'Cash collected':'Pay on delivery')}</span></div>
   {String(expandedId)===String(o.id)&&<div className="nx57-customer-order-body"><OrderTimeline order={o}/>
   {o.paymentMethod==='Razorpay'&&o.paymentStatus==='razorpay_pending'&&<div className="nx42-order-payment-actions">
    <button type="button" className="nx42-recheck-payment" disabled={Boolean(checkingId)} onClick={()=>checkPayment(o.id)}>{checkingId===o.id?'Checking with Razorpay…':'Check payment status'}</button>
    <button type="button" className="nx42-recheck-payment" disabled={Boolean(checkingId)} onClick={()=>retryPayment(o)}>Retry payment securely</button>
   </div>}
   {o.cancellationRequest&&<div className={`nx45-cancellation-status is-${o.cancellationRequest.status}`} role="status"><strong>Cancellation request: {o.cancellationRequest.status==='pending'?'Awaiting review':o.cancellationRequest.status==='approved'?'Approved':'Declined'}</strong><p>{o.cancellationRequest.status==='approved'&&o.paymentMethod==='Razorpay'&&o.refundStatus==='failed'?'Razorpay refund failed. Nexora must review it; your order has not been cancelled yet.':o.cancellationRequest.status==='approved'&&o.paymentMethod==='Razorpay'&&o.refundStatus!=='processed'?'Your refund is under verification. Order cancellation is finalized only after Razorpay confirms processing.':o.cancellationRequest.status==='pending'?'Your request is with the Nexora team. Fulfillment is paused while it is reviewed.':o.cancellationRequest.adminResponse||'Your cancellation request has been reviewed.'}</p>{o.cancellationRequest.status==='declined'&&o.cancellationRequest.adminResponse&&<small>Reason: {o.cancellationRequest.adminResponse}</small>}</div>}
   {['placed','confirmed'].includes(o.status)&&!o.refundStatus&&!o.cancellationRequest&&((o.paymentMethod==='Razorpay'&&o.paymentStatus==='razorpay_paid')||(o.paymentMethod!=='Razorpay'&&o.paymentStatus==='cod_pending'))&&<div className="nx45-customer-actions"><button type="button" onClick={()=>{setCancelOrder(o);setCancelError('');}}>Request cancellation</button></div>}
   <div className="nx25-order-breakdown nx38-order-breakdown"><span><span>Items</span><strong>{money(o.subtotal)}</strong></span><span><span>Shipping</span><strong>{money(o.shippingFee)}</strong></span>{Number(o.discountAmount)>0&&<span className="nx78-order-discount"><span>Coupon {o.couponCode||""}</span><strong>−{money(o.discountAmount)}</strong></span>}<span><span>{o.taxPricingMode==='exclusive'?'GST added':'GST included'}</span><strong>{money(o.taxTotal)}</strong></span><span><span>{o.paymentMethod==="Razorpay"?"Order total":"Amount due on delivery"}</span><strong>{money(o.total)}</strong></span></div>
   <div className="nx-order-footer"><span>{o.paymentMethod==='Razorpay'
    ? o.refundStatus==='processed'?'Full refund processed · order cancelled':o.refundStatus==='failed'?'Refund failed · store review required':o.refundStatus?'Full refund in progress · do not pay again':o.paymentStatus==='razorpay_paid'?'✓ Paid online (Razorpay)':o.paymentStatus==='razorpay_review'?'Payment requires manual review':o.paymentStatus==='razorpay_expired'?'Unpaid payment reservation expired':'Awaiting captured online payment · do not repay until checked'
    : `Cash on Delivery · ${o.paymentStatus === 'cod_collected' ? 'Collection recorded' : 'Awaiting cash on delivery'}`}</span><span>{o.address?.city}, {o.address?.state}</span></div></div>}
 </article>)}</div>}
 {cancelOrder&&<OrderCancellationDialog order={cancelOrder} busy={cancelBusy} error={cancelError} onClose={()=>{if(!cancelBusy)setCancelOrder(null);}} onConfirm={sendCancellation}/>}
 </CustomerLayout>;
}
