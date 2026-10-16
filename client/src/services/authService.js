import { apiRequest } from "./apiClient";

export function login(credentials) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
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

export function logout() {
  return apiRequest("/api/auth/logout", { method: "POST", credentials: "include" });
}
