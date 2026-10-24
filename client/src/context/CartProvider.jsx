import { useEffect, useState } from 'react';
import { CartContext } from './cartContext';
import { getCurrentUser } from '../services/authService';
import { cartStorageKey, sanitizeCart } from '../services/cartIdentity';

const GUEST_KEY = cartStorageKey(null);
function readCart(key) {
  try { return sanitizeCart(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return []; }
}

export default function CartProvider({ children }) {
  // Keep the key and the items together so an old account's cart can never
  // be persisted under the new account's key during a session switch.
  const [cart, setCart] = useState({ key: GUEST_KEY, items: [] });
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    let alive = true;
    let generation = 0;
    async function syncSession() {
      const id = ++generation;
      // Only the initial load may suspend the router; after login, preserve navigation.
      setSwitching(true);
      let user = null;
      try { user = (await getCurrentUser()).user; }
      catch { /* Unauthenticated is a guest cart, never another customer's cart. */ }
      if (!alive || id !== generation) return;
      const key = cartStorageKey(user);
      setCart({key, items: key === 'nexora_cart_v2_staff_empty' ? [] : readCart(key)});
      setReady(true);
      setSwitching(false);
    }
    syncSession();
    window.addEventListener('nexora:auth-changed', syncSession);
    const onStorage = event => {
      if (event.key === 'nexora_session_broadcast_v1') { syncSession(); return; }
      setCart(current => event.key === current.key ? {...current, items:readCart(current.key)} : current);
    };
    window.addEventListener('storage',onStorage);
    return () => {alive=false;generation++;window.removeEventListener('nexora:auth-changed',syncSession);window.removeEventListener('storage',onStorage);};
  }, []);
  useEffect(() => {
    if (ready && !switching && cart.key !== 'nexora_cart_v2_staff_empty') {
      localStorage.setItem(cart.key, JSON.stringify(cart.items));
    }
  }, [cart, ready, switching]);
  function change(fn) { if (switching) return; setCart(previous => ({...previous, items: fn(previous.items)})); }
  function addToCart(id, quantity=1, variantId=null) {
    id=String(id);variantId=variantId==null?null:String(variantId);
    if (!/^[1-9]\d*$/.test(id) || (variantId && !/^[1-9]\d*$/.test(variantId)) ||
        !Number.isInteger(quantity) || quantity < 1 || (!ready || switching) || cart.key === 'nexora_cart_v2_staff_empty') return;
    change(previous => {
      const same = item => item.productId===id && (item.variantId||null)===variantId;
      if (previous.some(same)) return previous.map(item=>same(item)?{...item,quantity:Math.min(99,item.quantity+quantity)}:item);
      return previous.length>=50?previous:[...previous,{productId:id,variantId,quantity:Math.min(99,quantity)}];
    });
  }
  function updateQuantity(id,quantity,variantId=null) {
    if(!Number.isInteger(quantity)||quantity<1||quantity>99) return;
    change(previous=>previous.map(item=>item.productId===String(id)&&(item.variantId||null)===(variantId||null)?{...item,quantity}:item));
  }
  function removeFromCart(id,variantId=null) {
    change(previous=>previous.filter(item=>!(item.productId===String(id)&&(item.variantId||null)===(variantId||null))));
  }
  function clearCart(){change(()=>[]);}
  if(!ready)return <div className="nx73-cart-bootstrap" role="status">Loading your storefront…</div>;
  return <CartContext.Provider value={{items:switching?[]:cart.items,itemCount:switching?0:cart.items.reduce((sum,item)=>sum+item.quantity,0),addToCart,updateQuantity,removeFromCart,clearCart}}>{children}</CartContext.Provider>;
}
