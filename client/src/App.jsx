import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import CustomerSignup from "./pages/CustomerSignup";
import VerifyOTP from "./pages/VerifyOTP";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/signup" replace />}
        />

        <Route
          path="/signup"
          element={<CustomerSignup />}
        />

        <Route
          path="/verify-otp"
          element={<VerifyOTP />}
        />
      </Routes>
    </BrowserRouter>
  );
}