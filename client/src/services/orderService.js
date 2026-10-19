import { apiRequest } from "./apiClient";
const sessionOptions = { credentials: "include" };
export function estimateCodOrder(payload){return apiRequest("/api/orders/estimate",{...sessionOptions,method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});}
export function createCodOrder(payload) { return apiRequest("/api/orders/cod", { ...sessionOptions, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); }
export function getMyOrders(signal) { return apiRequest("/api/orders/mine", { ...sessionOptions, signal }); }
export function getAdminOrders(signal) { return apiRequest("/api/admin/orders", { ...sessionOptions, signal }); }
export function getCodSummary(signal) { return apiRequest("/api/admin/orders/summary", { ...sessionOptions, signal }); }
export function updateCodStatus(id,status) { return apiRequest(`/api/admin/orders/${id}/status`, { ...sessionOptions, method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); }
