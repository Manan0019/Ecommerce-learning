import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import Home from "./pages/Home";
import CustomerSignup from "./pages/CustomerSignup";
import VerifyOTP from "./pages/VerifyOTP";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AddProduct from "./pages/AddProduct";
import AdminProducts from "./pages/AdminProducts";
import EditProduct from "./pages/EditProduct";
import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";
import CartPage from "./pages/CartPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import "./App.css";

export default function App() {
  return <CartProvider><BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/signup" element={<CustomerSignup />} />
    <Route path="/verify-otp" element={<VerifyOTP />} />
    <Route path="/login" element={<CustomerLogin />} />
    <Route path="/dashboard" element={<CustomerDashboard />} />
    <Route path="/admin/login" element={<Navigate to="/login" replace />} />
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/products" element={<AdminProducts />} />
    <Route path="/admin/products/new" element={<AddProduct />} />
    <Route path="/admin/products/:id/edit" element={<EditProduct />} />
    <Route path="/products" element={<ProductList />} />
    <Route path="/products/:id" element={<ProductDetails />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="*" element={<p>Page not found.</p>} />
  </Routes></BrowserRouter></CartProvider>;
}
