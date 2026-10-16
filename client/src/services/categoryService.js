import { apiRequest } from "./apiClient";

export function getCategories(signal) {
  return apiRequest("/api/categories", { signal });
}

export function getAdminCategories(signal) {
  return apiRequest("/api/admin/categories", { credentials: "include", signal });
}

export function createCategory(formData) {
  return apiRequest("/api/admin/categories", {
    method: "POST",
    credentials: "include",
    body: formData
  });
}

export function updateCategory(id, formData) {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData
  });
}

export function updateCategoryStatus(id, isActive) {
  return apiRequest(`/api/admin/categories/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive })
  });
}
