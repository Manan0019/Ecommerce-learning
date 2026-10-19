import { apiRequest } from './apiClient';
const credentials='include';
export const getAddresses=signal=>apiRequest('/api/addresses',{credentials,signal});
export const createAddress=body=>apiRequest('/api/addresses',{credentials,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const updateAddress=(id,body)=>apiRequest(`/api/addresses/${id}`,{credentials,method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export const deleteAddress=id=>apiRequest(`/api/addresses/${id}`,{credentials,method:'DELETE'});
export const markDefaultAddress=id=>apiRequest(`/api/addresses/${id}/default`,{credentials,method:'PATCH'});
