import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import AddressFields from '../../components/customer/AddressFields';
import { blankAddress } from '../../constants/addressDefaults';
import {useCart} from '../../hooks/useCart';
import {quoteCart} from '../../services/cartService';
import {getCurrentUser} from '../../services/authService';
import {getAddresses,createAddress} from '../../services/addressService';
import {createCodOrder,estimateCodOrder} from '../../services/orderService';
import {apiAssetUrl,isAuthenticationError} from '../../services/apiClient';
import {checkoutIntentKey,checkoutAcceptable} from '../../services/checkoutIntent';

const money=value=>`₹${Number(value??0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function Checkout(){
 const navigate=useNavigate(),{items,clearCart}=useCart();
 const [addresses,setAddresses]=useState([]),[selectedId,setSelectedId]=useState('new'),[address,setAddress]=useState({...blankAddress});
 const [quote,setQuote]=useState(null),[estimate,setEstimate]=useState(null),[codEnabled,setCodEnabled]=useState(false);
 const [checking,setChecking]=useState(true),[posting,setPosting]=useState(false),[estimating,setEstimating]=useState(false);
 const [error,setError]=useState(''),[needsCartReview,setNeedsCartReview]=useState(false),[role,setRole]=useState(null),[saveNew,setSaveNew]=useState(true);
 const [estimateFor,setEstimateFor]=useState(''),[quotedCart,setQuotedCart]=useState(''),[updatedQuote,setUpdatedQuote]=useState(false);
 const requestRef=useRef({intent:null,key:crypto.randomUUID()});
 const submitLock=useRef(false);
 const cartKey=JSON.stringify(items);
 useEffect(()=>{const controller=new AbortController();async function load(){try{
  const account=await getCurrentUser(controller.signal);
  if(account.user?.role!=='customer'){navigate(account.user?.role==='admin'?'/admin/dashboard':'/login',{replace:true});return}
  setRole('customer');setAddress(old=>({...old,fullName:account.user.fullName||'',phone:account.user.mobileNumber||''}));
  const [q,saved]=await Promise.all([quoteCart(items,controller.signal),getAddresses(controller.signal)]);
  if(!controller.signal.aborted){setQuote(q);setQuotedCart(cartKey);setAddresses(saved.addresses||[]);const preferred=(saved.addresses||[]).find(a=>a.isDefault)||(saved.addresses||[])[0];if(preferred)setSelectedId(preferred.id);}
 }catch(e){if(isAuthenticationError(e))navigate('/login',{replace:true,state:{from:'/checkout',message:'Sign in to complete checkout.'}});else if(!controller.signal.aborted)setError(e.message)}finally{if(!controller.signal.aborted)setChecking(false)}}load();return()=>controller.abort()},[items,navigate,cartKey]);
 const activeAddress=selectedId==='new'?address:addresses.find(a=>a.id===selectedId);
 const validAddress=activeAddress&&activeAddress.pincode?.length===6&&activeAddress.state?.trim()&&activeAddress.city?.trim()&&activeAddress.addressLine1?.length>=5&&activeAddress.fullName?.length>=2&&activeAddress.phone?.length>=10;
 const intentKey=checkoutIntentKey(items,selectedId,address);
 const cartValid=quotedCart===cartKey && quote?.valid;
 const canSubmit=checkoutAcceptable({estimate,estimateFor,intentKey,cartValid,codEnabled,posting,estimating});
 useEffect(()=>{
  if(!cartValid||!items.length||!validAddress)return;
  const ctrl=new AbortController();
  const tick=setTimeout(()=>{
   const payload={items,...(selectedId==='new'?{address}:{addressId:selectedId})};
   setEstimating(true);
   estimateCodOrder(payload,ctrl.signal).then(result=>{
    if(!ctrl.signal.aborted){setEstimate(result.estimate);setEstimateFor(intentKey);setCodEnabled(result.codEnabled);setUpdatedQuote(false);setError('');}
   }).catch(e=>{
    if(!ctrl.signal.aborted){setEstimate(null);setEstimateFor('');setError(e.message);}
   }).finally(()=>{if(!ctrl.signal.aborted)setEstimating(false)});
  },350);
  return()=>{clearTimeout(tick);ctrl.abort()};
 },[intentKey,items,selectedId,address,cartValid,validAddress]);
 async function submit(e){
  e.preventDefault();
  if(submitLock.current||!canSubmit||!items.length)return;
  submitLock.current=true;setPosting(true);setError('');setNeedsCartReview(false);
  try{
    if(requestRef.current.intent!==intentKey)requestRef.current={intent:intentKey,key:crypto.randomUUID()};
    const result=await createCodOrder({items,...(selectedId==='new'?{address}:{addressId:selectedId}),paymentMethod:'cod',requestKey:requestRef.current.key,acceptedQuote:estimate});
    // The order already committed; optional address persistence must not duplicate it.
    if(selectedId==='new'&&saveNew)try{await createAddress({...address,label:'Home',isDefault:addresses.length===0})}catch{ /* optional */ }
    clearCart();navigate('/orders',{replace:true,state:{placedId:result.order.id,alreadyPlaced:result.alreadyPlaced}});
  }catch(e){
    if(isAuthenticationError(e))navigate('/login',{replace:true});
    else if(e?.data?.requiresEstimateReview&&e.data.latestEstimate){
      // No order was saved. Make the customer explicitly confirm the revised amount.
      setEstimate(e.data.latestEstimate);setEstimateFor(intentKey);setUpdatedQuote(true);
      setError(e.message||'The total changed. Review it and confirm again.');
      try{const fresh=await quoteCart(items);if(fresh){setQuote(fresh);setQuotedCart(cartKey)}}catch{ /* keep prior cart and allow correction from Cart */ }
    }else {setNeedsCartReview(e?.data?.requiresCartReview===true);setError(e.message)};
  }finally{submitLock.current=false;setPosting(false)}
 }
 return <CustomerLayout mainClassName="nx-cod-page nx25-checkout">
  <div className="nx-page-intro"><Link className="nx-back-link" to="/cart">← Back to cart</Link><p className="eyebrow">Secure COD checkout</p><h1>Delivery & payment</h1><p>Choose an address, review shipping and included taxes, and place your Cash on Delivery order.</p></div>
  {checking&&<p className="nx-cod-message" role="status">Checking items, account and saved addresses…</p>}
  {error&&<p role="alert" className="nx-cod-message nx-cod-error">{error} {needsCartReview&&<Link to="/cart">Review your cart →</Link>}</p>}
  {!checking&&role==='customer'&&<div className="nx-cod-grid">
   <form className="nx-cod-panel" onSubmit={submit}>
    <div className="nx-section-heading"><span className="nx-step-number">01</span><div><h2>Delivery address</h2><p>Choose a saved address or add a new one.</p></div></div>
    {addresses.length>0&&<div className="nx25-address-options">{addresses.map(a=><label key={a.id} className={`nx25-address-choice ${selectedId===a.id?'is-selected':''}`}><input type="radio" name="selectedAddress" checked={selectedId===a.id} disabled={posting} onChange={()=>{setSelectedId(a.id);setEstimate(null);setEstimateFor('');setUpdatedQuote(false);setError('')}}/><span><strong>{a.label||'Home'}{a.isDefault?' · Default':''}</strong><small>{a.fullName} · {a.addressLine1}, {a.city}, {a.state} {a.pincode}</small></span></label>)}</div>}
    <label className="nx25-address-choice"><input type="radio" name="selectedAddress" checked={selectedId==='new'} disabled={posting} onChange={()=>{setSelectedId('new');setEstimate(null);setEstimateFor('');setUpdatedQuote(false);setError('')}}/> <strong>+ Use a new address</strong></label>
    {selectedId==='new'&&<><AddressFields address={address} onChange={v=>{setAddress(v);setEstimate(null);setEstimateFor('');setUpdatedQuote(false)}} disabled={posting}/><label className="nx25-check"><input type="checkbox" checked={saveNew} onChange={e=>setSaveNew(e.target.checked)}/> Save this address to my account</label></>}
    <Link to="/addresses" className="nx25-manage-link">Manage saved addresses →</Link>
    <div className="nx-cod-method"><div className="nx-section-heading"><span className="nx-step-number">02</span><div><h2>Payment method</h2><p>Online payments are not available.</p></div></div><div className="nx-cod-method-selected"><span>✓</span><div><strong>Cash on Delivery</strong><small>Pay when your order arrives.</small></div></div></div>
    {!codEnabled&&validAddress&&quote?.valid&&<p className="nx-cod-message nx-cod-error" role="status">The store has not enabled COD checkout yet. Please contact the store.</p>}
    <button className="button button-primary nx-cod-submit" type="submit" disabled={checking||!validAddress||!canSubmit}>{posting?'Placing order…':updatedQuote?`Confirm revised total · ${money(estimate?.total)}`:`Place COD order · ${money(estimate?.total)}`}</button>
    {updatedQuote&&<p className="nx-cod-message nx40-review" role="status">Your prices, shipping or included tax changed. Review the amount due and select Confirm revised total to place the order.</p>}
    <p className="nx-cod-note">Your shown subtotal, shipping and included GST must match the final server quote. Stock is checked again and no online charge is made.</p>
   </form>
   <aside className="nx-cod-panel nx-cod-summary"><div className="nx-section-heading"><span className="nx-step-number">03</span><div><h2>Order summary</h2><p>Amounts are in INR, including GST where configured.</p></div></div>
    {!quote?.valid&&<p className="nx-cod-message nx-cod-error">Some items are unavailable. <Link to="/cart">Review your cart</Link>.</p>}
    {quote?.items?.map(item=><div className="nx-cod-summary-line" key={`${item.productId}-${item.variantId||''}`}><div className="nx-cod-summary-product">{item.imageUrl&&<img src={apiAssetUrl(item.imageUrl)} loading="lazy" alt=""/>}<div><strong>{item.name||'Unavailable product'}</strong><small>{item.sku?`${item.sku} · `:''}Qty {item.quantity}</small></div></div><span>{item.lineTotal?money(item.lineTotal):'—'}</span></div>)}
    <div className="nx-cod-summary-line"><span>Products subtotal</span><strong>{money(estimateFor===intentKey?estimate?.subtotal:quote?.availableSubtotal)}</strong></div>
    <div className="nx-cod-summary-line"><span>Shipping</span><strong>{estimateFor===intentKey&&estimate?Number(estimate.shippingFee)===0?'Free':money(estimate.shippingFee):'Enter address'}</strong></div>
    {estimateFor===intentKey&&estimate&&<><div className="nx-cod-summary-line"><span>Included GST ({estimate.taxType})</span><strong>{money(estimate.includedTax)}</strong></div><div className="nx25-tax-details"><small>Taxable value: {money(estimate.taxableValue)}</small><small>{estimate.taxType==='IGST'?`IGST: ${money(estimate.igst)}`:`CGST: ${money(estimate.cgst)} · SGST: ${money(estimate.sgst)}`}</small></div></>}
    <div className="nx-cod-total"><span>Pay on delivery</span><strong>{estimateFor===intentKey&&estimate?money(estimate.total):'—'}</strong></div>
    <p className="nx-cod-note">Tax shown is included in item prices and shipping charges; it is not added again. Verify final tax rules before live sales.</p>
   </aside>
  </div>}
 </CustomerLayout>
}
