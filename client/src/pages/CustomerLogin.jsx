import { useState } from "react";
import {
  useNavigate,
  useLocation,
  Link
} from "react-router-dom";
import { API_BASE_URL } from "../config/api";

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
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed."
        );
      }

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
