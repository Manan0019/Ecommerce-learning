import { apiRequest } from "./apiClient";

export async function login(credentials) {
  const result=await apiRequest("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  window.dispatchEvent(new Event('nexora:auth-changed'));
  return result;
}

export function registerCustomer(formData) {
  return apiRequest("/api/auth/signup", { method: "POST", body: formData });
}

export function verifyRegistration(payload) {
  return apiRequest("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function getCurrentUser(signal) {
  return apiRequest("/api/auth/me", { credentials: "include", signal });
}

export function updateCustomerName(fullName) {
  return apiRequest("/api/auth/profile/name", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName })
  });
}

export function updateCustomerPassword(passwords) {
  return apiRequest("/api/auth/profile/password", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(passwords)
  });
}

export function requestPasswordReset(email) {
 return apiRequest('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
}
export function resetPassword(payload) {
 return apiRequest('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
}
export async function logout() {
  const result=await apiRequest("/api/auth/logout", { method: "POST", credentials: "include" });
  window.dispatchEvent(new Event('nexora:auth-changed'));
  return result;
}
