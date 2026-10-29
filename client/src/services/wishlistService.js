import { apiRequest } from "./apiClient";
export const getWishlist = (signal) => apiRequest("/api/wishlist", { credentials: "include", signal });
export const addWishlist = (productId) => apiRequest(`/api/wishlist/${encodeURIComponent(productId)}`, { method: "PUT", credentials: "include" });
export const removeWishlist = (productId) => apiRequest(`/api/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE", credentials: "include" });

export const getWishlistAlertPreferences = signal => apiRequest('/api/wishlist/alert-preferences',{credentials:'include',signal});
export const saveWishlistAlertPreferences = preferences => apiRequest('/api/wishlist/alert-preferences',{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(preferences)});
export const getWishlistAlerts = signal => apiRequest('/api/wishlist/alerts',{credentials:'include',signal});
