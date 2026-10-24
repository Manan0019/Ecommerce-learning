import { apiRequest } from "./apiClient";

export function getAdmin(signal) {
  return apiRequest("/api/admin/me", { credentials: "include", signal });
}

export function getAdminSummary(signal) {
  return apiRequest("/api/admin/summary", { credentials: "include", signal });
}

export function getCustomers(signal, query = "", page = 1) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("page",String(page));
  return apiRequest(`/api/admin/customers${params.size ? `?${params}` : ""}`, { credentials: "include", signal });
}
