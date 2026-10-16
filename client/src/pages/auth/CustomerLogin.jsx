import { useState } from "react";
import {
  useNavigate,
  useLocation,
  Link
} from "react-router-dom";
import { login } from "../../services/authService";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    location.state?.message || ""
  );

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const data = await login({ email, password });

      navigate(data.user.role === "admin" ? "/admin/dashboard" : "/", { replace: true });

    } catch (error) {
      setMessage(error.message);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}

      <p>
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
