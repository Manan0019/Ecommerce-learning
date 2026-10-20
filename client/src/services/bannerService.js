import {apiRequest} from "./apiClient";
export const getBanners=(position,target,signal)=>apiRequest(`/api/banners?${new URLSearchParams({position,...(position==="category"&&target?{category:target}:{}),...(position==="product"&&target?{product:String(target)}:{})})}`,{signal});
export const getAdminBanners=()=>apiRequest('/api/admin/banners',{credentials:'include'});
export const searchPromotionProducts=(q,signal)=>apiRequest(`/api/admin/banners/product-options?q=${encodeURIComponent(q)}`,{credentials:'include',signal});
export const saveBanner=(id,data)=>apiRequest(id?`/api/admin/banners/${id}`:'/api/admin/banners',{
  method:id?'PUT':'POST',credentials:'include',body:data});
export const setBannerActive=(id,isActive)=>apiRequest(`/api/admin/banners/${id}/status`,{
  method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive})});

export const reorderPromotions=(ids,expectedIds)=>apiRequest('/api/admin/banners/order',{
  method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,expectedIds})});
export const setPromotionDisplayCount=(homeVisibleCount,homeAutoplay,homeRotateSeconds)=>apiRequest('/api/admin/banners/display',{
  method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({homeVisibleCount,homeAutoplay,homeRotateSeconds})});
