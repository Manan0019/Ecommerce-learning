import { apiRequest } from "./apiClient";
const sessionOptions = { credentials: "include" };
export function estimateCodOrder(payload,signal){return apiRequest("/api/orders/estimate",{...sessionOptions,signal,method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});}
export function createCodOrder(payload) { return apiRequest("/api/orders/cod", { ...sessionOptions, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function getMyOrders(signal) { return apiRequest("/api/orders/mine", { ...sessionOptions, signal }); }
export function getAdminOrders(signal) { return apiRequest("/api/admin/orders", { ...sessionOptions, signal }); }
export function getCodSummary(signal) { return apiRequest("/api/admin/orders/summary", { ...sessionOptions, signal }); }
export function updateCodStatus(id,status,details={}) { return apiRequest(`/api/admin/orders/${id}/status`, { ...sessionOptions, method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status,...details }) }); }

export function confirmCodCollection(id){return apiRequest(`/api/admin/orders/${id}/collect`, {...sessionOptions,method:"POST",headers:{"Content-Type":"application/json"}});}

export function getRazorpayConfig(signal){return apiRequest('/api/payments/razorpay/config',{...sessionOptions,signal});}
export function initiateRazorpayOrder(payload){return apiRequest('/api/payments/razorpay/initiate',{...sessionOptions,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}
export function verifyRazorpayPayment(payload){return apiRequest('/api/payments/razorpay/verify',{...sessionOptions,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}
export function getRazorpayOrderStatus(id,signal){return apiRequest(`/api/payments/razorpay/orders/${id}`,{...sessionOptions,signal});}
export function expireUnpaidRazorpayOrder(id){return apiRequest(`/api/payments/razorpay/admin/orders/${id}/expire`,{...sessionOptions,method:'POST',headers:{'Content-Type':'application/json'}});}
export function reconcileRazorpayOrder(id){return apiRequest(`/api/payments/razorpay/orders/${id}/reconcile`,{...sessionOptions,method:'POST',headers:{'Content-Type':'application/json'}});}
export function retryRazorpayCheckout(id){return apiRequest(`/api/payments/razorpay/orders/${id}/checkout`,{...sessionOptions});}

export function requestRazorpayRefund(id, reason){return apiRequest(`/api/payments/razorpay/admin/orders/${id}/refund`,{...sessionOptions,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});}
export function reconcileRazorpayRefund(id){return apiRequest(`/api/payments/razorpay/admin/orders/${id}/refund/reconcile`,{...sessionOptions,method:'POST',headers:{'Content-Type':'application/json'}});}

export function getRazorpayRefundConfig(signal){return apiRequest('/api/payments/razorpay/admin/refund-config',{...sessionOptions,signal});}
