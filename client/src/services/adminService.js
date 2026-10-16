import { apiRequest } from "./apiClient";

export function getAdmin(signal) {
  return apiRequest("/api/admin/me", { credentials: "include", signal });
}

export function getAdminSummary(signal) {
  return apiRequest("/api/admin/summary", { credentials: "include", signal });
}

export function getCustomers(signal) {
  return apiRequest("/api/admin/customers", { credentials: "include", signal });
}
