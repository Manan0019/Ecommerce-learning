import {apiRequest} from './apiClient';
const opts={credentials:'include'};
export const getDeliveryHealth=signal=>apiRequest('/api/admin/delivery/health',{...opts,signal});
export const getDeliveryStaff=signal=>apiRequest('/api/admin/delivery/staff',{...opts,signal});
export const createDeliveryStaff=body=>apiRequest('/api/admin/delivery/staff',{...opts,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const setDeliveryStaffActive=(id,isActive)=>apiRequest(`/api/admin/delivery/staff/${id}`,{...opts,method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive})});
export const getAdminAssignments=signal=>apiRequest('/api/admin/delivery/assignments',{...opts,signal});
export const assignDelivery=(orderId,executiveId)=>apiRequest(`/api/admin/delivery/orders/${orderId}/assign`,{...opts,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({executiveId})});
export const assignDeliveryBatch=(orderIds,executiveId)=>apiRequest('/api/admin/delivery/assignments/batch',{...opts,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderIds,executiveId})});
export const getMyAssignments=signal=>apiRequest('/api/delivery/assignments',{...opts,signal});
export const updateMyDelivery=(orderId,status)=>apiRequest(`/api/delivery/assignments/${orderId}`,{...opts,method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
export const getNotifications=signal=>apiRequest('/api/notifications',{...opts,signal});
export const markNotificationRead=id=>apiRequest(`/api/notifications/${id}/read`,{...opts,method:'PATCH'});
export const markAllNotificationsRead=()=>apiRequest('/api/notifications/read-all',{...opts,method:'PATCH'});

export const getDeliverySession=signal=>apiRequest('/api/delivery/session',{credentials:'include',signal});

export const reportDeliveryIssue=(orderId,body)=>apiRequest(`/api/delivery/assignments/${orderId}/issues`,{
 ...opts,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const retryDeliveryIssue=orderId=>apiRequest(`/api/admin/delivery/orders/${orderId}/retry-delivery`,{
 ...opts,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'retry'})});

export const resendDeliveryCode=orderId=>apiRequest(`/api/delivery/assignments/${orderId}/otp/resend`,{
  ...opts,method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
export const confirmDeliveryCode=(orderId,otp)=>apiRequest(`/api/delivery/assignments/${orderId}/confirm-delivery`,{
  ...opts,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({otp})});
