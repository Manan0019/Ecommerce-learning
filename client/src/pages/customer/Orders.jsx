import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import OrderTimeline from "../../components/customer/OrderTimeline";
import OrderCancellationDialog from "../../components/customer/OrderCancellationDialog";
import { getMyOrders, reconcileRazorpayOrder, retryRazorpayCheckout, verifyRazorpayPayment, requestOrderCancellation } from "../../services/orderService";
import { isAuthenticationError } from "../../services/apiClient";
import { loadRazorpayCheckout } from "../../services/razorpayCheckout";
import {useCart} from "../../hooks/useCart";
const money=x=>`₹${Number(x||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export default function Orders(){
 const navigate=useNavigate(),location=useLocation(),{items:cartItems,clearCart}=useCart();
 const [orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState(''),[checkingId,setCheckingId]=useState('');
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
 useEffect(()=>{const controller=new AbortController();getMyOrders(controller.signal).then(d=>setOrders(d.orders||[])).catch(e=>{if(isAuthenticationError(e))navigate("/login",{replace:true,state:{from:"/orders"}});else if(e.name!=="AbortError")setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[navigate]);
 return <CustomerLayout mainClassName="nx-orders-page"><div className="nx-page-intro"><p className="eyebrow">Your orders</p><h1>Follow every order</h1><p>Follow COD and Razorpay orders from payment confirmation through delivery.</p></div>
 {location.state?.placedId&&<div className="nx-cod-message nx-cod-success" role="status">✓ Order #{location.state.placedId} {location.state.alreadyPlaced?"was already placed":"was placed successfully"}. {location.state.paidOnline?"Razorpay payment captured and verified.":"Pay on delivery."}</div>}
 {error&&<div className="nx-cod-message nx-cod-error" role="alert">{error}</div>}
 {success&&<div className="nx-cod-message nx-cod-success" role="status">{success}</div>}
 {loading?<p role="status">Loading orders…</p>:!orders.length?<div className="store-empty"><h2>No orders yet</h2><p>When you order, you can follow its progress here.</p><Link className="button button-primary" to="/products">Explore products</Link></div>:<div className="nx-orders-list">{orders.map(o=><article className="nx-order-card nx38-customer-order" key={o.id}>
   <div className="nx-order-heading"><div><small>Order #{o.id} · {new Date(o.placedAt).toLocaleDateString("en-IN")}</small><h2>{money(o.total)} <span className="nx38-item-count">· {o.items.length} item{o.items.length===1?"":"s"}</span></h2></div><span className={`nx-status nx-status-${o.status}`}>{o.status}</span></div>
   <OrderTimeline order={o}/>
   {o.paymentMethod==='Razorpay'&&o.paymentStatus==='razorpay_pending'&&<div className="nx42-order-payment-actions">
    <button type="button" className="nx42-recheck-payment" disabled={Boolean(checkingId)} onClick={()=>checkPayment(o.id)}>{checkingId===o.id?'Checking with Razorpay…':'Check payment status'}</button>
    <button type="button" className="nx42-recheck-payment" disabled={Boolean(checkingId)} onClick={()=>retryPayment(o)}>Retry payment securely</button>
   </div>}
   {o.cancellationRequest&&<div className={`nx45-cancellation-status is-${o.cancellationRequest.status}`} role="status"><strong>Cancellation request: {o.cancellationRequest.status==='pending'?'Awaiting review':o.cancellationRequest.status==='approved'?'Approved':'Declined'}</strong><p>{o.cancellationRequest.status==='approved'&&o.paymentMethod==='Razorpay'&&o.refundStatus==='failed'?'Razorpay refund failed. Nexora must review it; your order has not been cancelled yet.':o.cancellationRequest.status==='approved'&&o.paymentMethod==='Razorpay'&&o.refundStatus!=='processed'?'Your refund is under verification. Order cancellation is finalized only after Razorpay confirms processing.':o.cancellationRequest.status==='pending'?'Your request is with the Nexora team. Fulfillment is paused while it is reviewed.':o.cancellationRequest.adminResponse||'Your cancellation request has been reviewed.'}</p>{o.cancellationRequest.status==='declined'&&o.cancellationRequest.adminResponse&&<small>Reason: {o.cancellationRequest.adminResponse}</small>}</div>}
   {['placed','confirmed'].includes(o.status)&&!o.refundStatus&&!o.cancellationRequest&&((o.paymentMethod==='Razorpay'&&o.paymentStatus==='razorpay_paid')||(o.paymentMethod!=='Razorpay'&&o.paymentStatus==='cod_pending'))&&<div className="nx45-customer-actions"><button type="button" onClick={()=>{setCancelOrder(o);setCancelError('');}}>Request cancellation</button></div>}
   <div className="nx-order-items">{o.items.map((item,i)=><div className="nx-order-product" key={`${item.productId}-${item.variantId||"base"}-${i}`}><div><strong>{item.name}</strong><small>{item.sku||"Standard"} · Qty {item.quantity}</small></div><span>{money(item.lineTotal)}</span></div>)}</div>
   <div className="nx25-order-breakdown nx38-order-breakdown"><span><span>Items</span><strong>{money(o.subtotal)}</strong></span><span><span>Shipping</span><strong>{money(o.shippingFee)}</strong></span><span><span>Included GST</span><strong>{money(o.taxTotal)}</strong></span><span><span>{o.paymentMethod==="Razorpay"?"Order total":"Amount due on delivery"}</span><strong>{money(o.total)}</strong></span></div>
   <div className="nx-order-footer"><span>{o.paymentMethod==='Razorpay'
    ? o.refundStatus==='processed'?'Full refund processed · order cancelled':o.refundStatus==='failed'?'Refund failed · store review required':o.refundStatus?'Full refund in progress · do not pay again':o.paymentStatus==='razorpay_paid'?'✓ Paid online (Razorpay)':o.paymentStatus==='razorpay_review'?'Payment requires manual review':o.paymentStatus==='razorpay_expired'?'Unpaid payment reservation expired':'Awaiting captured online payment · do not repay until checked'
    : `Cash on Delivery · ${o.paymentStatus === 'cod_collected' ? 'Collection recorded' : 'Awaiting cash on delivery'}`}</span><span>{o.address?.city}, {o.address?.state}</span></div>
 </article>)}</div>}
 {cancelOrder&&<OrderCancellationDialog order={cancelOrder} busy={cancelBusy} error={cancelError} onClose={()=>{if(!cancelBusy)setCancelOrder(null);}} onConfirm={sendCancellation}/>}
 </CustomerLayout>;
}
