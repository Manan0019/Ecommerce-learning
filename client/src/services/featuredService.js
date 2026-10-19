import { apiRequest } from './apiClient';
const options = (method, body) => ({method,credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const getFeaturedAdmin = signal => apiRequest('/api/admin/featured',{credentials:'include',signal});
export const searchFeaturedCandidates = (query, signal) => apiRequest(`/api/admin/featured/candidates?q=${encodeURIComponent(query)}`,{credentials:'include',signal});
export const reorderFeaturedAdmin = ids => apiRequest('/api/admin/featured/order',options('PUT',{ids}));
export const setFeaturedAdmin = (id,isFeatured) => apiRequest(`/api/admin/featured/${id}`,options('PATCH',{isFeatured}));
