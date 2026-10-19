import {apiRequest} from "./apiClient";
export const getBanners=(position,category,signal)=>apiRequest(`/api/banners?${new URLSearchParams({position,...(category?{category}:{})})}`,{signal});
export const getAdminBanners=()=>apiRequest('/api/admin/banners',{credentials:'include'});
export const saveBanner=(id,data)=>apiRequest(id?`/api/admin/banners/${id}`:'/api/admin/banners',{
  method:id?'PUT':'POST',credentials:'include',body:data});
export const setBannerActive=(id,isActive)=>apiRequest(`/api/admin/banners/${id}/status`,{
  method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive})});
