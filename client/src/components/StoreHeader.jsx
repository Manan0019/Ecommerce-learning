import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
export default function StoreHeader() {
  const { itemCount } = useCart();
  return <header className="store-header">
    <Link to="/products"><strong>My Ecommerce Store</strong></Link>
    <nav className="store-nav">
      <Link to="/products">Products</Link>
      <Link to="/cart">Cart ({itemCount})</Link>
      <Link to="/dashboard">Profile</Link>
      <Link to="/login">Login</Link>
    </nav>
  </header>;
}
