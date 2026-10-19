import { apiRequest } from "./apiClient";
export function getBranding(signal) { return apiRequest("/api/branding", { signal }); }
export function uploadBrandLogo(file) {
  const body = new FormData(); body.append("logo", file);
  return apiRequest("/api/admin/branding/logo", { method: "PUT", body, credentials: "include" });
}
export function resetBrandLogo() { return apiRequest("/api/admin/branding/logo", { method: "DELETE", credentials: "include" }); }
export function uploadBrandFavicon(file) {
  const body = new FormData(); body.append("favicon", file);
  return apiRequest("/api/admin/branding/favicon", { method: "PUT", body, credentials: "include" });
}
export function resetBrandFavicon() { return apiRequest("/api/admin/branding/favicon", { method: "DELETE", credentials: "include" }); }
