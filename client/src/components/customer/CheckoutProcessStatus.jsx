import UiIcon from '../common/UiIcon';
/** Payment progress is driven ONLY by actual checkout callbacks, never by a fake timer. */
const labels={
 placing:'Placing your COD order',
 opening:'Preparing secure Razorpay checkout',
 verifying:'Verifying your payment',
 confirmed:'Order confirmed'
};
export default function CheckoutProcessStatus({phase,amount}){
 if(!phase||phase==='idle'||phase==='provider')return null;
 const complete=phase==='confirmed';
 const label=labels[phase]||labels.opening;
 return <div className="nx64-checkout-overlay" role="status" aria-live="polite" aria-label={label}>
  <div className={`nx64-checkout-card ${complete?'is-ready':''}`}>
   <div className="nx64-checkout-stage" aria-hidden="true">
    <span className="nx64-checkout-item a"/><span className="nx64-checkout-item b"/><span className="nx64-checkout-item c"/>
    <svg className="nx64-checkout-cart" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11h8l7.6 25.4a5 5 0 0 0 4.8 3.6h21.9a5 5 0 0 0 4.8-3.5L58 19H16.5"/><circle cx="27" cy="52" r="4.2"/><circle cx="47" cy="52" r="4.2"/></svg>
    <span className="nx64-checkout-done"><UiIcon name="check" size={42}/></span>
   </div>
   <strong>{label}</strong>
   <span className="nx64-checkout-amount">{amount}</span>
   <div className="nx64-checkout-track" role="progressbar" aria-label={label} aria-valuetext={complete?'Complete':label} {...(complete?{'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':100}:{})}><span /></div>
   <p>{complete?'Verified by Nexora. Opening your orders.':phase==='verifying'?'Checking the confirmed payment with our server. Please do not pay again.':'Please keep this page open while we prepare your order.'}</p>
  </div>
 </div>;
}
