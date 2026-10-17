import { apiRequest } from "./apiClient";

export function getProducts({ signal, category, params } = {}) {
  const searchParams = params instanceof URLSearchParams
    ? new URLSearchParams(params)
    : new URLSearchParams();
  if (category) searchParams.set("category", category);
  const queryString = searchParams.toString();
  const query = queryString ? `?${queryString}` : "";
  return apiRequest(`/api/products${query}`, { signal });
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

export function getProductMedia(id, admin = false, signal) {
 return apiRequest(admin ? `/api/admin/products/${id}/media` : `/api/products/${id}/media`, { signal, ...(admin ? { credentials:"include" } : {}) });
}
export function addProductImage(id, file) {
 const body=new FormData();body.append("image",file);
 return apiRequest(`/api/admin/products/${id}/media`,{method:"POST",credentials:"include",body});
}
export function addProductVideo(id, url) {
 return apiRequest(`/api/admin/products/${id}/media`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})});
}
export function reorderProductMedia(id, ids) {
 return apiRequest(`/api/admin/products/${id}/media/order`,{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
}
export function removeProductMedia(id,mediaId) {
 return apiRequest(`/api/admin/products/${id}/media/${mediaId}`,{method:"DELETE",credentials:"include"});
}
export function updateFeatured(id,isFeatured) {
 return apiRequest(`/api/admin/products/${id}/featured`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({isFeatured})});
}

export function addProductLocalVideo(id, file) {
 const body=new FormData();body.append("video",file);
 return apiRequest(`/api/admin/products/${id}/media/video`,{method:"POST",credentials:"include",body});
}
export function setProductCover(id,mediaId) {
 return apiRequest(`/api/admin/products/${id}/media/${mediaId}/cover`,{method:"PUT",credentials:"include"});
}

export function assignProductMediaVariant(productId,mediaId,variantId){
 return apiRequest(`/api/admin/products/${productId}/media/${mediaId}/variant`,{
  method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({variantId})
 });
}

export function deleteProductPermanently(id, confirmName) {
 return apiRequest(`/api/admin/products/${id}`,{method:"DELETE",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmName})});
}
export function assignProductMediaScope(id,mediaId,assignment){
 return apiRequest(`/api/admin/products/${id}/media/${mediaId}/assignment`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(assignment)});
}
