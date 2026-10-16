import { Navigate } from "react-router-dom";

// Keep old imports compatible with the unified login.
export default function AdminLogin() {
  return <Navigate to="/login" replace />;
}
