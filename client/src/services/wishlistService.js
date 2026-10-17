import { apiRequest } from "./apiClient";
export const getWishlist = (signal) => apiRequest("/api/wishlist", { credentials: "include", signal });
export const addWishlist = (productId) => apiRequest(`/api/wishlist/${encodeURIComponent(productId)}`, { method: "PUT", credentials: "include" });
export const removeWishlist = (productId) => apiRequest(`/api/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE", credentials: "include" });
