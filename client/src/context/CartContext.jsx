import { createContext, useContext, useEffect, useState } from "react";
const Context = createContext(null);
const KEY = "ecommerce_cart_v1";
function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.filter(item => {
      if (!item || typeof item.productId !== "string" ||
          !/^[1-9]\d*$/.test(item.productId) ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
          seen.has(item.productId)) return false;
      seen.add(item.productId);
      return true;
    }).slice(0, 50);
  } catch { return []; }
}
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);
  function addToCart(id, quantity = 1) {
    id = String(id);
    if (!/^[1-9]\d*$/.test(id) || !Number.isInteger(quantity) || quantity < 1) return;
    setItems(prev => {
      const found = prev.some(p => p.productId === id);
      if (found) return prev.map(p => p.productId === id
        ? { ...p, quantity: Math.min(99, p.quantity + quantity) } : p);
      if (prev.length >= 50) return prev;
      return [...prev, { productId: id, quantity: Math.min(99, quantity) }];
    });
  }
  function updateQuantity(id, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
    setItems(prev => prev.map(p => p.productId === String(id) ? { ...p, quantity } : p));
  }
  function removeFromCart(id) { setItems(prev => prev.filter(p => p.productId !== String(id))); }
  function clearCart() { setItems([]); }
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return <Context.Provider value={{ items, itemCount, addToCart, updateQuantity, removeFromCart, clearCart }}>
    {children}
  </Context.Provider>;
}
// Kept beside the provider to preserve the existing public CartContext API.
// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const cart = useContext(Context);
  if (!cart) throw new Error("useCart must be inside CartProvider");
  return cart;
}
