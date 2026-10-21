// Load Razorpay's official Standard Checkout only when the shopper opts to pay online.
let scriptLoading;
export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Payment checkout needs a browser.'));
  if (typeof window.Razorpay === 'function') return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve,reject) => {
      const tag=document.createElement('script');
      tag.src='https://checkout.razorpay.com/v1/checkout.js';
      tag.async=true;
      tag.onload=()=>typeof window.Razorpay === 'function' ? resolve() : reject(new Error('Razorpay Checkout could not load.'));
      tag.onerror=()=>reject(new Error('Could not load secure checkout. Check your connection.'));
      document.head.appendChild(tag);
    }).catch(e=>{scriptLoading=null;throw e;});
  }
  return scriptLoading;
}
