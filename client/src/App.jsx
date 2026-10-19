import { BrowserRouter, Routes, Route } from "react-router-dom";
import CartProvider from "./context/CartProvider";
import AddProduct from "./pages/admin/AddProduct";
import AdminComingSoon from "./pages/admin/AdminComingSoon";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminBanners from "./pages/admin/AdminBanners";
import EditProduct from "./pages/admin/EditProduct";
import CustomerLogin from "./pages/auth/CustomerLogin";
import CustomerSignup from "./pages/auth/CustomerSignup";
import VerifyOTP from "./pages/auth/VerifyOTP";
import CartPage from "./pages/customer/CartPage";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import AdminOrders from "./pages/admin/AdminOrders";
import Wishlist from "./pages/customer/Wishlist";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import Home from "./pages/customer/Home";
import ProductDetails from "./pages/customer/ProductDetails";
import ProductList from "./pages/customer/ProductList";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Categories from "./pages/customer/Categories";
import "./styles/app.css";
import "./styles/wishlist.css";
import "./styles/phase14.css";
import "./styles/phase15.css";
import "./styles/phase16.css";
import "./styles/phase17.css";
import "./styles/phase18.css";
import "./styles/phase19.css";
import "./styles/phase21.css";
import "./styles/phase23.css";

export default function App() {
  return <CartProvider><BrowserRouter><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/signup" element={<CustomerSignup />} />
    <Route path="/verify-otp" element={<VerifyOTP />} />
    <Route path="/login" element={<CustomerLogin />} />
    <Route path="/dashboard" element={<CustomerDashboard />} />
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/products" element={<AdminProducts />} />
    <Route path="/admin/products/new" element={<AddProduct />} />
    <Route path="/admin/products/:id/edit" element={<EditProduct />} />
    <Route path="/admin/customers" element={<AdminCustomers />} />
    <Route path="/admin/categories" element={<AdminCategories />} />
    <Route path="/admin/banners" element={<AdminBanners />} />
    <Route path="/admin/orders" element={<AdminOrders />} />
    <Route path="/admin/analytics" element={<AdminComingSoon title="Analytics" />} />
    <Route path="/admin/settings" element={<AdminComingSoon title="Settings" />} />
    <Route path="/products" element={<ProductList />} />
    <Route path="/products/:id" element={<ProductDetails />} />
    <Route path="/categories" element={<Categories />} />
    <Route path="/categories/:slug" element={<ProductList />} />
    <Route path="/cart" element={<CartPage />} />
    <Route path="/checkout" element={<Checkout />} />
    <Route path="/orders" element={<Orders />} />
    <Route path="/wishlist" element={<Wishlist />} />
    <Route path="/about" element={<About />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="*" element={<p>Page not found.</p>} />
  </Routes></BrowserRouter></CartProvider>;
}
