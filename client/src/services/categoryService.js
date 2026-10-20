import { apiRequest } from "./apiClient";

let publicCategoryCache = null;
let categoryCacheAt = 0;
const CATEGORY_CACHE_MS = 20_000;
export function getCategories(signal) {
  if (publicCategoryCache && Date.now() - categoryCacheAt < CATEGORY_CACHE_MS) {
    return Promise.resolve(publicCategoryCache);
  }
  return apiRequest("/api/categories", { signal }).then(result => {
    if (!signal?.aborted) { publicCategoryCache = result; categoryCacheAt = Date.now(); }
    return result;
  });
}
export function invalidatePublicCategoryCache() { publicCategoryCache = null; categoryCacheAt = 0; }

export function getAdminCategories(signal) {
  return apiRequest("/api/admin/categories", { credentials: "include", signal });
}

export function getAdminSpecificationDefinition(categoryId, signal) {
  return apiRequest(`/api/admin/categories/${categoryId}/specifications`, {
    credentials: "include",
    signal
  });
}

export function createCategory(formData) {
  return apiRequest("/api/admin/categories", {
    method: "POST",
    credentials: "include",
    body: formData
  }).then(result => { invalidatePublicCategoryCache(); return result; });
}

export function updateCategory(id, formData) {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "PUT",
    credentials: "include",
    body: formData
  }).then(result => { invalidatePublicCategoryCache(); return result; });
}

export function updateCategoryStatus(id, isActive) {
  return apiRequest(`/api/admin/categories/${id}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive })
  }).then(result => { invalidatePublicCategoryCache(); return result; });
}

export function deleteCategory(id, confirmName) {
  return apiRequest(`/api/admin/categories/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmName })
  }).then(result => { invalidatePublicCategoryCache(); return result; });
}
