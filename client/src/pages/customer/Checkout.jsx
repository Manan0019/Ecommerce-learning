import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import AddressFields,{blankAddress} from '../../components/customer/AddressFields';
import {useCart} from '../../hooks/useCart';
import {quoteCart} from '../../services/cartService';
import {getCurrentUser} from '../../services/authService';
import {getAddresses,createAddress} from '../../services/addressService';
import {createCodOrder,estimateCodOrder} from '../../services/orderService';
import {apiAssetUrl,isAuthenticationError} from '../../services/apiClient';

const money=value=>`₹${Number(value??0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function Checkout(){
 const navigate=useNavigate(),{items,clearCart}=useCart();
 const [addresses,setAddresses]=useState([]),[selectedId,setSelectedId]=useState('new'),[address,setAddress]=useState({...blankAddress});
 const [quote,setQuote]=useState(null),[estimate,setEstimate]=useState(null),[codEnabled,setCodEnabled]=useState(false);
 const [checking,setChecking]=useState(true),[posting,setPosting]=useState(false),[estimating,setEstimating]=useState(false);
 const [error,setError]=useState(''),[role,setRole]=useState(null),[saveNew,setSaveNew]=useState(true);
 const requestKey=useRef(crypto.randomUUID());
 useEffect(()=>{const controller=new AbortController();async function load(){try{
  const account=await getCurrentUser(controller.signal);
  if(account.user?.role!=='customer'){navigate(account.user?.role==='admin'?'/admin/dashboard':'/login',{replace:true});return}
  setRole('customer');setAddress(old=>({...old,fullName:account.user.fullName||'',phone:account.user.mobileNumber||''}));
  const [q,saved]=await Promise.all([quoteCart(items,controller.signal),getAddresses(controller.signal)]);
  if(!controller.signal.aborted){setQuote(q);setAddresses(saved.addresses||[]);const preferred=(saved.addresses||[]).find(a=>a.isDefault)||(saved.addresses||[])[0];if(preferred)setSelectedId(preferred.id);}
 }catch(e){if(isAuthenticationError(e))navigate('/login',{replace:true,state:{from:'/checkout',message:'Sign in to complete checkout.'}});else if(!controller.signal.aborted)setError(e.message)}finally{if(!controller.signal.aborted)setChecking(false)}}load();return()=>controller.abort()},[items,navigate]);
 const activeAddress=selectedId==='new'?address:addresses.find(a=>a.id===selectedId);
 const validAddress=activeAddress&&activeAddress.pincode?.length===6&&activeAddress.state?.trim()&&activeAddress.city?.trim()&&activeAddress.addressLine1?.length>=5&&activeAddress.fullName?.length>=2&&activeAddress.phone?.length>=10;
 useEffect(()=>{
  if(!quote?.valid||!items.length||!validAddress)return;
  const ctrl=new AbortController();const tick=setTimeout(()=>{
   const payload={items,...(selectedId==='new'?{address}:{addressId:selectedId})};setEstimating(true);
   estimateCodOrder(payload).then(r=>{if(!ctrl.signal.aborted){setEstimate(r.estimate);setCodEnabled(r.codEnabled)}}).catch(e=>{if(!ctrl.signal.aborted){setEstimate(null);setError(e.message)}}).finally(()=>{if(!ctrl.signal.aborted)setEstimating(false)});
  },350);
  return()=>{clearTimeout(tick);ctrl.abort()};
 },[items,quote,selectedId,address,validAddress]);
 async function submit(e){e.preventDefault();if(posting||!quote?.valid||!estimate||!codEnabled||!items.length)return;
  setPosting(true);setError('');try{
    const result=await createCodOrder({items,...(selectedId==='new'?{address}:{addressId:selectedId}),paymentMethod:'cod',requestKey:requestKey.current});
    // Saving a new address is optional and must not roll back or duplicate a successful order.
    if(selectedId==='new'&&saveNew)try{await createAddress({...address,label:'Home',isDefault:addresses.length===0})}catch{ /* order is already saved: optional address save can be retried from account */ }
    clearCart();navigate('/orders',{replace:true,state:{placedId:result.order.id,alreadyPlaced:result.alreadyPlaced}});
  }catch(e){if(isAuthenticationError(e))navigate('/login',{replace:true});else setError(e.message)}finally{setPosting(false)}
 }
 return <CustomerLayout mainClassName="nx-cod-page nx25-checkout">
  <div className="nx-page-intro"><Link className="nx-back-link" to="/cart">← Back to cart</Link><p className="eyebrow">Secure COD checkout</p><h1>Delivery & payment</h1><p>Choose an address, review shipping and included taxes, and place your Cash on Delivery order.</p></div>
  {checking&&<p className="nx-cod-message" role="status">Checking items, account and saved addresses…</p>}
  {error&&<p role="alert" className="nx-cod-message nx-cod-error">{error}</p>}
  {!checking&&role==='customer'&&<div className="nx-cod-grid">
   <form className="nx-cod-panel" onSubmit={submit}>
    <div className="nx-section-heading"><span className="nx-step-number">01</span><div><h2>Delivery address</h2><p>Choose a saved address or add a new one.</p></div></div>
    {addresses.length>0&&<div className="nx25-address-options">{addresses.map(a=><label key={a.id} className={`nx25-address-choice ${selectedId===a.id?'is-selected':''}`}><input type="radio" name="selectedAddress" checked={selectedId===a.id} onChange={()=>{setSelectedId(a.id);setEstimate(null);setError('')}}/><span><strong>{a.label||'Home'}{a.isDefault?' · Default':''}</strong><small>{a.fullName} · {a.addressLine1}, {a.city}, {a.state} {a.pincode}</small></span></label>)}</div>}
    <label className="nx25-address-choice"><input type="radio" name="selectedAddress" checked={selectedId==='new'} onChange={()=>{setSelectedId('new');setEstimate(null);setError('')}}/> <strong>+ Use a new address</strong></label>
    {selectedId==='new'&&<><AddressFields address={address} onChange={v=>{setAddress(v);setEstimate(null)}} disabled={posting}/><label className="nx25-check"><input type="checkbox" checked={saveNew} onChange={e=>setSaveNew(e.target.checked)}/> Save this address to my account</label></>}
    <Link to="/addresses" className="nx25-manage-link">Manage saved addresses →</Link>
    <div className="nx-cod-method"><div className="nx-section-heading"><span className="nx-step-number">02</span><div><h2>Payment method</h2><p>Online payments are not available.</p></div></div><div className="nx-cod-method-selected"><span>✓</span><div><strong>Cash on Delivery</strong><small>Pay when your order arrives.</small></div></div></div>
    {!codEnabled&&validAddress&&quote?.valid&&<p className="nx-cod-message nx-cod-error" role="status">The store has not enabled COD checkout yet. Please contact the store.</p>}
    <button className="button button-primary nx-cod-submit" type="submit" disabled={posting||checking||estimating||!quote?.valid||!estimate||!codEnabled||!validAddress}>{posting?'Placing order…':`Place COD order · ${money(estimate?.total)}`}</button>
    <p className="nx-cod-note">Final prices and stock are rechecked on the server. No online charge is made.</p>
   </form>
   <aside className="nx-cod-panel nx-cod-summary"><div className="nx-section-heading"><span className="nx-step-number">03</span><div><h2>Order summary</h2><p>Amounts are in INR, including GST where configured.</p></div></div>
    {!quote?.valid&&<p className="nx-cod-message nx-cod-error">Some items are unavailable. <Link to="/cart">Review your cart</Link>.</p>}
    {quote?.items?.map(item=><div className="nx-cod-summary-line" key={`${item.productId}-${item.variantId||''}`}><div className="nx-cod-summary-product">{item.imageUrl&&<img src={apiAssetUrl(item.imageUrl)} loading="lazy" alt=""/>}<div><strong>{item.name||'Unavailable product'}</strong><small>{item.sku?`${item.sku} · `:''}Qty {item.quantity}</small></div></div><span>{item.lineTotal?money(item.lineTotal):'—'}</span></div>)}
    <div className="nx-cod-summary-line"><span>Products subtotal</span><strong>{money(estimate?.subtotal??quote?.availableSubtotal)}</strong></div>
    <div className="nx-cod-summary-line"><span>Shipping</span><strong>{estimate?Number(estimate.shippingFee)===0?'Free':money(estimate.shippingFee):'Enter address'}</strong></div>
    {estimate&&<><div className="nx-cod-summary-line"><span>Included GST ({estimate.taxType})</span><strong>{money(estimate.includedTax)}</strong></div><div className="nx25-tax-details"><small>Taxable value: {money(estimate.taxableValue)}</small><small>{estimate.taxType==='IGST'?`IGST: ${money(estimate.igst)}`:`CGST: ${money(estimate.cgst)} · SGST: ${money(estimate.sgst)}`}</small></div></>}
    <div className="nx-cod-total"><span>Pay on delivery</span><strong>{estimate?money(estimate.total):'—'}</strong></div>
    <p className="nx-cod-note">Tax shown is included in item prices and shipping charges; it is not added again. Verify final tax rules before live sales.</p>
   </aside>
  </div>}
 </CustomerLayout>
}
