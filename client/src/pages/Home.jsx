
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="auth-container">
      <h1>Welcome to Our Store</h1>

      <p>Please select how you want to continue.</p>

      <div className="login-options">
        <Link to="/login" className="login-link">
          Login
        </Link>

<Link to="/products" className="login-link">
  Browse Products
</Link>

        <Link to="/signup">
          Create Customer Account
        </Link>
      </div>
    </div>
  );
}
