import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import CustomerSignup from "./pages/CustomerSignup";
import VerifyOTP from "./pages/VerifyOTP";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AddProduct from "./pages/AddProduct";
import Home from "./pages/Home";
import ProductList from "./pages/ProductList";
import ProductDetails from "./pages/ProductDetails";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/signup" element={<CustomerSignup />} />

        <Route path="/verify-otp" element={<VerifyOTP />} />

        <Route path="/login" element={<CustomerLogin />} />

        <Route path="/dashboard" element={<CustomerDashboard />} />

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="/admin/products/new" element={<AddProduct />} />

        <Route path="/products" element={<ProductList />} />

        <Route path="/products/:id" element={<ProductDetails />} />
      </Routes>
    </BrowserRouter>
  );
}