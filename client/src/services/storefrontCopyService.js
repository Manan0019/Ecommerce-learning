import {apiRequest} from './apiClient';
export const getStorefrontCopy=signal=>apiRequest('/api/storefront-copy',{signal});
export const getAdminStorefrontCopy=()=>apiRequest('/api/admin/storefront-copy',{credentials:'include'});
export const saveStorefrontCopy=copy=>apiRequest('/api/admin/storefront-copy',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(copy)});
