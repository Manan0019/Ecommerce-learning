import { apiRequest } from "./apiClient";

export function getRelatedProducts(productId, signal) {
  return apiRequest(`/api/products/${encodeURIComponent(productId)}/related`, {
    signal,
  });
}
