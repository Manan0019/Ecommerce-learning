import { apiRequest } from "./apiClient";

export function quoteCart(items, signal) {
  return apiRequest("/api/cart/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    signal
  });
}
