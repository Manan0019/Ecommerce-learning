import { useEffect, useState } from "react";
import { CartContext } from "./cartContext";

const KEY = "ecommerce_cart_v1";

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed.filter((item) => {
      if (!item || typeof item.productId !== "string" ||
          !/^[1-9]\d*$/.test(item.productId) ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 ||
          seen.has(item.productId)) return false;
      seen.add(item.productId);
      return true;
    }).slice(0, 50);
  } catch {
    return [];
  }
}

export default function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  function addToCart(id, quantity = 1) {
    id = String(id);
    if (!/^[1-9]\d*$/.test(id) || !Number.isInteger(quantity) || quantity < 1) return;
    setItems((previousItems) => {
      const found = previousItems.some((item) => item.productId === id);
      if (found) {
        return previousItems.map((item) => item.productId === id
          ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
          : item);
      }
      if (previousItems.length >= 50) return previousItems;
      return [...previousItems, { productId: id, quantity: Math.min(99, quantity) }];
    });
  }

  function updateQuantity(id, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
    setItems((previousItems) => previousItems.map((item) => item.productId === String(id)
      ? { ...item, quantity }
      : item));
  }

  function removeFromCart(id) {
    setItems((previousItems) => previousItems.filter((item) => item.productId !== String(id)));
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return <CartContext.Provider value={{
    items,
    itemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart
  }}>
    {children}
  </CartContext.Provider>;
}
