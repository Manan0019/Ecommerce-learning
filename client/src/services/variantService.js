import { apiRequest } from "./apiClient";
export const getVariants = (productId, admin = false) =>
  apiRequest(
    `${admin ? "/api/admin" : "/api"}/products/${productId}/variants`,
    { credentials: "include" },
  );
export const createVariant = (productId, variant) =>
  apiRequest(`/api/admin/products/${productId}/variants`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variant),
  });
export const updateVariant = (productId, variantId, variant) =>
  apiRequest(`/api/admin/products/${productId}/variants/${variantId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(variant),
  });
