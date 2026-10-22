import {apiRequest} from './apiClient';
export const getFooterContent=(signal)=>apiRequest('/api/footer',{signal});
export const getAdminFooter=()=>apiRequest('/api/admin/footer',{credentials:'include'});
export const saveFooterContent=(data)=>apiRequest('/api/admin/footer',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
export function uploadFooterArtwork(file){const body=new FormData();body.append('image',file);return apiRequest('/api/admin/footer/artwork',{method:'POST',credentials:'include',body});}
export const removeFooterArtwork=()=>apiRequest('/api/admin/footer/artwork',{method:'DELETE',credentials:'include'});
