import { useEffect, useState } from "react";
import { CartContext } from "./cartContext";

const KEY = "ecommerce_cart_v1";

function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .filter((item) => {
        if (
          !item ||
          typeof item.productId !== "string" ||
          !/^[1-9]\d*$/.test(item.productId) ||
          (item.variantId != null &&
            (typeof item.variantId !== "string" ||
              !/^[1-9]\d*$/.test(item.variantId))) ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 99 ||
          seen.has(`${item.productId}:${item.variantId || ""}`)
        )
          return false;
        seen.add(`${item.productId}:${item.variantId || ""}`);
        return true;
      })
      .slice(0, 50);
  } catch {
    return [];
  }
}

export default function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  function addToCart(id, quantity = 1, variantId = null) {
    id = String(id);
    variantId = variantId == null ? null : String(variantId);
    if (
      !/^[1-9]\d*$/.test(id) ||
      (variantId && !/^[1-9]\d*$/.test(variantId)) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    )
      return;
    setItems((previous) => {
      const same = (item) =>
        item.productId === id && (item.variantId || null) === variantId;
      if (previous.some(same))
        return previous.map((item) =>
          same(item)
            ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
            : item,
        );
      if (previous.length >= 50) return previous;
      return [
        ...previous,
        { productId: id, variantId, quantity: Math.min(99, quantity) },
      ];
    });
  }
  function updateQuantity(id, quantity, variantId = null) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
    setItems((previous) =>
      previous.map((item) =>
        item.productId === String(id) &&
        (item.variantId || null) === (variantId || null)
          ? { ...item, quantity }
          : item,
      ),
    );
  }
  function removeFromCart(id, variantId = null) {
    setItems((previous) =>
      previous.filter(
        (item) =>
          !(
            item.productId === String(id) &&
            (item.variantId || null) === (variantId || null)
          ),
      ),
    );
  }

  function clearCart() {
    setItems([]);
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
