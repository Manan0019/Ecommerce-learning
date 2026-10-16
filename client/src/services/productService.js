import { apiRequest } from "./apiClient";

export function getProducts(signal) {
  return apiRequest("/api/products", { signal });
}

export function getProduct(id, signal) {
  return apiRequest(`/api/products/${id}`, { signal });
}

export function getAdminProducts(signal) {
  return apiRequest("/api/admin/products", { credentials: "include", signal });
}

export function getAdminProduct(id, signal) {
  return apiRequest(`/api/admin/products/${id}`, { credentials: "include", signal });
}

export function createProduct(formData) {
  return apiRequest("/api/admin/products", {
    method: "POST",
    credentials: "include",
    body: formData
  });
}

export function updateProduct(id, product) {
  return apiRequest(`/api/admin/products/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });
}

export function updateProductImage(id, formData) {
  return apiRequest(`/api/admin/products/${id}/image`, {
    method: "PUT",
    credentials: "include",
    body: formData
  });
}

export function updateProductStatus(id, isActive) {
  return apiRequest(`/api/admin/products/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive })
  });
}
