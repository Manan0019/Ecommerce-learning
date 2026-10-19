import { apiRequest } from './apiClient';
export const getLowStockAlerts = (limit=100,signal) => apiRequest(`/api/admin/inventory/low-stock?limit=${limit}`,{credentials:'include',signal});
