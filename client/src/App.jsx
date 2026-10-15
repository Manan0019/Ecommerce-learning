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

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/signup"
          element={<CustomerSignup />}
        />

        <Route
          path="/verify-otp"
          element={<VerifyOTP />}
        />

        <Route
          path="/login"
          element={<CustomerLogin />}
        />

        <Route
          path="/dashboard"
          element={<CustomerDashboard />}
        />
      </Routes>
    </BrowserRouter>
  );
}