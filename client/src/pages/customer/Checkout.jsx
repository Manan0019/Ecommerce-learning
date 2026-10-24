import { Button, Checkbox, EntitySubtitle, FormField, TextField } from "../../components/ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import CheckoutProcessStatus from "../../components/customer/CheckoutProcessStatus";
import {useEffect,useRef,useState} from 'react';
import UiIcon from "../../components/common/UiIcon";
import {Link,useNavigate} from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import AddressFields from '../../components/customer/AddressFields';
import { blankAddress } from '../../constants/addressDefaults';
import {useCart} from '../../hooks/useCart';
import {quoteCart} from '../../services/cartService';
import {getCurrentUser} from '../../services/authService';
import {getAddresses,createAddress} from '../../services/addressService';
import {createCodOrder,estimateCodOrder,getRazorpayConfig,initiateRazorpayOrder,verifyRazorpayPayment} from '../../services/orderService';
import {loadRazorpayCheckout} from '../../services/razorpayCheckout';
import {apiAssetUrl,isAuthenticationError} from '../../services/apiClient';
import {checkoutIntentKey,checkoutAcceptable} from '../../services/checkoutIntent';

const money=value=>`₹${Number(value??0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function Checkout(){
 const liveRevision=useRealtimeRevision(["inventory","catalog","promotions"]);
 const navigate=useNavigate(),{items,clearCart}=useCart();
 const [addresses,setAddresses]=useState([]),[selectedId,setSelectedId]=useState('new'),[address,setAddress]=useState({...blankAddress});
 const [quote,setQuote]=useState(null),[estimate,setEstimate]=useState(null),[codEnabled,setCodEnabled]=useState(false);
 const [paymentMethod,setPaymentMethod]=useState('cod'),[razorpayEnabled,setRazorpayEnabled]=useState(false);
 const [checking,setChecking]=useState(true),[posting,setPosting]=useState(false),[estimating,setEstimating]=useState(false);
 const [paymentPhase,setPaymentPhase]=useState('idle');
 const [couponCode,setCouponCode]=useState(''),[appliedCoupon,setAppliedCoupon]=useState(''),[couponStatus,setCouponStatus]=useState('');
 const [error,setError]=useState(''),[needsCartReview,setNeedsCartReview]=useState(false),[role,setRole]=useState(null),[saveNew,setSaveNew]=useState(true);
 const [estimateFor,setEstimateFor]=useState(''),[quotedCart,setQuotedCart]=useState(''),[updatedQuote,setUpdatedQuote]=useState(false);
 const requestRef=useRef({intent:null,key:crypto.randomUUID()});
 const submitLock=useRef(false);
 const cartKey=JSON.stringify(items);
 useEffect(()=>{const controller=new AbortController();async function load(){try{
  const account=await getCurrentUser(controller.signal);
  if(account.user?.role!=='customer'){navigate(account.user?.role==='admin'?'/admin/dashboard':'/login',{replace:true});return}
  setRole('customer');setAddress(old=>({...old,fullName:account.user.fullName||'',phone:account.user.mobileNumber||''}));
  const [q,saved,paymentConfig]=await Promise.all([quoteCart(items,controller.signal),getAddresses(controller.signal),getRazorpayConfig(controller.signal).catch(()=>({enabled:false}))]);
  if(!controller.signal.aborted){setQuote(q);setQuotedCart(cartKey);setRazorpayEnabled(Boolean(paymentConfig.enabled));setAddresses(saved.addresses||[]);const preferred=(saved.addresses||[]).find(a=>a.isDefault)||(saved.addresses||[])[0];if(preferred)setSelectedId(preferred.id);}
 }catch(e){if(isAuthenticationError(e))navigate('/login',{replace:true,state:{from:'/checkout',message:'Sign in to complete checkout.'}});else if(!controller.signal.aborted)setError(e.message)}finally{if(!controller.signal.aborted)setChecking(false)}}load();return()=>controller.abort()},[items,navigate,cartKey]);
 // Price, stock and coupon invalidation must not reset the address being edited.
 useEffect(()=>{
   if(!liveRevision||posting||!items.length)return;
   const controller=new AbortController();
   queueMicrotask(()=>{if(!controller.signal.aborted){setEstimate(null);setEstimateFor('');setCodEnabled(false);}});
    quoteCart(items,controller.signal).then(q=>{if(!controller.signal.aborted){setQuote(q);setQuotedCart(cartKey);}})
     .catch(()=>{if(!controller.signal.aborted)setError('The catalogue changed. Please review your cart before paying.');});
   return()=>controller.abort();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[liveRevision]);
 const activeAddress=selectedId==='new'?address:addresses.find(a=>a.id===selectedId);
 const validAddress=activeAddress&&activeAddress.pincode?.length===6&&activeAddress.state?.trim()&&activeAddress.city?.trim()&&activeAddress.addressLine1?.length>=5&&activeAddress.fullName?.length>=2&&activeAddress.phone?.length>=10;
 const intentKey=checkoutIntentKey(items,selectedId,address)+'::coupon:'+appliedCoupon;
 const cartValid=quotedCart===cartKey && quote?.valid;
 const canSubmit=checkoutAcceptable({estimate,estimateFor,intentKey,cartValid,codEnabled:paymentMethod==='cod'?codEnabled:razorpayEnabled,posting,estimating});
 useEffect(()=>{
  if(!cartValid||!items.length||!validAddress)return;
  const ctrl=new AbortController();
  const tick=setTimeout(()=>{
   const payload={items,couponCode:appliedCoupon,...(selectedId==='new'?{address}:{addressId:selectedId})};
   setEstimating(true);
   estimateCodOrder(payload,ctrl.signal).then(result=>{
    if(!ctrl.signal.aborted){setEstimate(result.estimate);setEstimateFor(intentKey);setCodEnabled(result.codEnabled);setUpdatedQuote(false);setCouponStatus(appliedCoupon?`Coupon ${appliedCoupon} applied · You save ${money(result.estimate?.discountAmount)}.`:'');setError('');}
   }).catch(e=>{
    if(!ctrl.signal.aborted){setEstimate(null);setEstimateFor('');if(appliedCoupon)setCouponStatus(e.message);else setError(e.message);}
   }).finally(()=>{if(!ctrl.signal.aborted)setEstimating(false)});
  },350);
  return()=>{clearTimeout(tick);ctrl.abort()};
 },[intentKey,items,selectedId,address,cartValid,validAddress,appliedCoupon]);
 async function submit(e){
  e.preventDefault();
  if(submitLock.current||!canSubmit||!items.length)return;
  submitLock.current=true;setPosting(true);setPaymentPhase(paymentMethod==='razorpay'?'opening':'placing');setError('');setNeedsCartReview(false);
  let checkoutOpened=false;
  const release=()=>{submitLock.current=false;setPosting(false);setPaymentPhase('idle')};
  const selectedAddress=selectedId==='new'?{address}:{addressId:selectedId};
  const finishOrder=async (order,paidOnline=false)=>{
    if(selectedId==='new'&&saveNew)try{await createAddress({...address,label:'Home',isDefault:addresses.length===0})}catch{/* Optional address save must not invalidate paid order. */}
    setPaymentPhase('confirmed');clearCart();navigate('/orders',{replace:true,state:{placedId:order.id,paidOnline,alreadyPlaced:false}});
  };
  try{
    const signature=`${intentKey}::${paymentMethod}`;
    if(requestRef.current.intent!==signature)requestRef.current={intent:signature,key:crypto.randomUUID()};
    const payload={items,couponCode:appliedCoupon,...selectedAddress,paymentMethod,requestKey:requestRef.current.key,acceptedQuote:estimate};
    if(paymentMethod==='razorpay'){
      // Load the provider UI first so script-blocking does not reserve any inventory.
      await loadRazorpayCheckout();
      const result=await initiateRazorpayOrder(payload);
      if(result.alreadyPaid){await finishOrder(result.order,true);return;}
      const payment=result.payment;
      let paymentHandled=false;
      const rzp=new window.Razorpay({
        key:payment.keyId,amount:payment.amountPaise,currency:payment.currency,
        order_id:payment.gatewayOrderId,name:'Nexora',description:`Order #${payment.orderId}`,
        prefill:{name:activeAddress?.fullName||'',contact:activeAddress?.phone||''},
        theme:{color:'#6952c4'},
        handler:async response=>{
          paymentHandled=true;setPaymentPhase('verifying');
          try{
            const confirmed=await verifyRazorpayPayment({orderId:payment.orderId,...response});
            if(confirmed.paid){await finishOrder(confirmed.order,true);return;}
            setError(confirmed.needsReview?'Payment requires store review. Please contact support.':'Payment is processing. Do not pay a second time; check Orders for confirmation.');
          }catch(error){setError(`Payment verification is pending: ${error.message}. Check Orders before trying again.`)}
          finally{release()}
        },
        modal:{ondismiss:()=>{
          if(paymentHandled)return;
          setError('Payment window closed. No online order is confirmed yet. Your pending payment is visible in Orders; you may reopen checkout with the same order.');
          release();
        }},
      });
      rzp.on('payment.failed',()=>{
        setError('This payment attempt failed. You can retry through Razorpay; your order is not yet confirmed.');
      });
      setPaymentPhase('provider');rzp.open();
      checkoutOpened=true;
      return;
    }
    const result=await createCodOrder(payload);
    await finishOrder(result.order,false);
  }catch(e){
    if(isAuthenticationError(e))navigate('/login',{replace:true});
    else if(e?.data?.requiresEstimateReview&&e.data.latestEstimate){
      setEstimate(e.data.latestEstimate);setEstimateFor(intentKey);setUpdatedQuote(true);
      setError(e.message||'The total changed. Review it and confirm again.');
      try{const fresh=await quoteCart(items);if(fresh){setQuote(fresh);setQuotedCart(cartKey)}}catch{/* keep cart */}
    }else {setNeedsCartReview(e?.data?.requiresCartReview===true);setError(e.message)}
  }finally{if(!checkoutOpened)release()}
 }
 return <CustomerLayout mainClassName="nx-cod-page nx25-checkout">
  <CheckoutProcessStatus phase={paymentPhase} amount={money(estimate?.total)} />
  <div className="nx-page-intro"><Link className="nx-back-link" to="/cart"><UiIcon name="left" size={17}/> Back to cart</Link><p className="eyebrow">Secure checkout</p><h1>Delivery & payment</h1><p>Choose an address, review shipping and GST, then pay online with Razorpay or choose Cash on Delivery.</p></div>
  {checking&&<p className="nx-cod-message" role="status">Checking items, account and saved addresses…</p>}
  {error&&<p role="alert" className="nx-cod-message nx-cod-error">{error} {needsCartReview&&<Link to="/cart">Review your cart</Link>}</p>}
  {!checking&&role==='customer'&&<div className="nx-cod-grid">
   <form className="nx-cod-panel" onSubmit={submit}>
    <div className="nx-section-heading"><span className="nx-step-number">01</span><div><h2>Delivery address</h2><p>Choose a saved address or add a new one.</p></div></div>
    {addresses.length>0&&<div className="nx25-address-options">{addresses.map(a=><FormField inline key={a.id} className={`nx25-address-choice ${selectedId===a.id?'is-selected':''}`}><Checkbox type="radio" name="selectedAddress" checked={selectedId===a.id} disabled={posting} onChange={()=>{setSelectedId(a.id);setEstimate(null);setEstimateFor('');setUpdatedQuote(false);setError('')}}/><span><strong>{a.label||'Home'}{a.isDefault?' · Default':''}</strong><small>{a.fullName} · {a.addressLine1}, {a.city}, {a.state} {a.pincode}</small></span></FormField>)}</div>}
    <FormField inline className="nx25-address-choice"><Checkbox type="radio" name="selectedAddress" checked={selectedId==='new'} disabled={posting} onChange={()=>{setSelectedId('new');setEstimate(null);setEstimateFor('');setUpdatedQuote(false);setError('')}}/> <strong>+ Use a new address</strong></FormField>
    {selectedId==='new'&&<><AddressFields address={address} onChange={v=>{setAddress(v);setEstimate(null);setEstimateFor('');setUpdatedQuote(false)}} disabled={posting}/><FormField inline className="nx25-check"><Checkbox type="checkbox" checked={saveNew} onChange={e=>setSaveNew(e.target.checked)}/> Save this address to my account</FormField></>}
    <Link to="/addresses" className="nx25-manage-link">Manage saved addresses</Link>
    <div className="nx-cod-method"><div className="nx-section-heading"><span className="nx-step-number">02</span><div><h2>Payment method</h2><p>Select your preferred payment method.</p></div></div>
      <div className="nx42-payment-choices">
       {razorpayEnabled&&<FormField inline className={`nx25-address-choice ${paymentMethod==='razorpay'?'is-selected':''}`}><Checkbox type="radio" name="paymentMethod" checked={paymentMethod==='razorpay'} disabled={posting} onChange={()=>{setPaymentMethod('razorpay');setError('')}}/><span><strong>Pay securely online · Razorpay</strong><small>UPI, cards, net banking and enabled methods. Paid only after server verification.</small></span></FormField>}
       <FormField inline className={`nx25-address-choice ${paymentMethod==='cod'?'is-selected':''}`}><Checkbox type="radio" name="paymentMethod" checked={paymentMethod==='cod'} disabled={posting} onChange={()=>{setPaymentMethod('cod');setError('')}}/><span><strong>Cash on Delivery</strong><small>Pay when your order arrives.</small></span></FormField>
      </div>
      {!razorpayEnabled&&<p className="nx-cod-note">Online payment is temporarily unavailable. Please choose Cash on Delivery.</p>}
     </div>
    <section className="nx73-coupon-field" aria-label="Coupon code">
      <FormField htmlFor="nx73-coupon-code"><strong>Have a coupon code?</strong><small>Apply a published offer. The final discount is verified by Nexora before payment.</small></FormField>
      <div className="nx73-coupon-row"><TextField id="nx73-coupon-code" type="text" autoComplete="off" maxLength={24} placeholder="Enter coupon code" value={couponCode} disabled={posting} onChange={event=>{setCouponCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''));if(appliedCoupon){setAppliedCoupon('');setEstimateFor('');}setCouponStatus('');}}/><Button variant="secondary" type="button" disabled={!couponCode.trim()||posting||!validAddress||!cartValid} onClick={()=>{setAppliedCoupon(couponCode.trim());setCouponStatus('Checking your coupon…');setEstimateFor('');}}>Apply code</Button>{appliedCoupon&&<Button variant="secondary" type="button" className="nx78-remove-coupon" disabled={posting} onClick={()=>{setAppliedCoupon('');setCouponCode('');setCouponStatus('Coupon removed.');setEstimateFor('');}}>Remove</Button>}</div>
      {couponStatus&&<p role="status" className="nx73-coupon-feedback">{couponStatus}</p>}
    </section>
    {paymentMethod==='cod'&&!codEnabled&&validAddress&&quote?.valid&&<p className="nx-cod-message nx-cod-error" role="status">The store has not enabled COD checkout yet. Please contact the store.</p>}
    <Button variant="primary" className="nx-cod-submit nx68-order-action" type="submit" disabled={checking||!validAddress||!canSubmit}>{posting?(paymentMethod==='razorpay'?'Opening secure payment…':'Placing order…'):updatedQuote?`Confirm revised total · ${money(estimate?.total)}`:paymentMethod==='razorpay'?`Pay online · ${money(estimate?.total)}`:`Place COD order · ${money(estimate?.total)}`}</Button>
    {updatedQuote&&<p className="nx-cod-message nx40-review" role="status">Your prices, shipping or tax changed. Review the amount due and select Confirm revised total to place the order.</p>}
    <p className="nx-cod-note">Review your items and delivery details before placing your order.</p>
   </form>
   <aside className="nx-cod-panel nx-cod-summary"><div className="nx-section-heading"><span className="nx-step-number">03</span><div><h2>Order summary</h2><p>Amounts are in INR, including GST where configured.</p></div></div>
    {!quote?.valid&&<p className="nx-cod-message nx-cod-error">Some items are unavailable. <Link to="/cart">Review your cart</Link>.</p>}
    {quote?.items?.map(item=><div className="nx-cod-summary-line" key={`${item.productId}-${item.variantId||''}`}><div className="nx-cod-summary-product">{item.imageUrl&&<img src={apiAssetUrl(item.imageUrl)} loading="lazy" alt=""/>}<div><strong>{item.name||'Unavailable product'}</strong><EntitySubtitle>{item.sku?`${item.sku} · `:''}Qty {item.quantity}</EntitySubtitle></div></div><span>{item.lineTotal?money(item.lineTotal):'—'}</span></div>)}
    <div className="nx-cod-summary-line"><span>Products subtotal</span><strong>{money(estimateFor===intentKey?estimate?.subtotal:quote?.availableSubtotal)}</strong></div>
    {estimateFor===intentKey&&estimate&&Number(estimate.discountAmount)>0&&<div className="nx-cod-summary-line nx78-discount-summary"><span>Coupon savings ({estimate.couponCode})</span><strong>−{money(estimate.discountAmount)}</strong></div>}
    <div className="nx-cod-summary-line"><span>Shipping {estimateFor===intentKey&&estimate?.shippingRegion?`· ${estimate.shippingRegion==='within-state'?'Within dispatch state':'Other state'}`:''}</span><strong>{estimateFor===intentKey&&estimate?Number(estimate.shippingFee)===0?'Free':money(estimate.shippingFee):'Enter address'}</strong></div>
    {estimateFor===intentKey&&estimate?.shippingReason==='threshold'&&<p className="nx75-shipping-explainer">Free shipping applies because the products subtotal meets your store's configured threshold.</p>}
    {estimateFor===intentKey&&estimate&&<><div className="nx-cod-summary-line"><span>{estimate.taxPricingMode==='exclusive'?'GST added':'GST included'} ({estimate.taxType})</span><strong>{money(estimate.includedTax)}</strong></div><div className="nx25-tax-details"><small>Taxable value: {money(estimate.taxableValue)}</small><small>{estimate.taxType==='IGST'?`IGST: ${money(estimate.igst)}`:`CGST: ${money(estimate.cgst)} · SGST: ${money(estimate.sgst)}`}</small></div></>}
    <div className="nx-cod-total"><span>{paymentMethod==='razorpay'?'Pay securely online':'Pay on delivery'}</span><strong>{estimateFor===intentKey&&estimate?money(estimate.total):'—'}</strong></div>
    <p className="nx-cod-note">{estimate?.taxPricingMode==='exclusive'?'GST is added to the displayed base price and shipping where applicable. Review your final total before paying.':'GST is included in prices where applicable; no additional tax is added.'}</p>
   </aside>
  </div>}
 </CustomerLayout>
}
