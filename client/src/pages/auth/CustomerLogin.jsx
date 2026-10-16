import { useState } from "react";
import {
  useNavigate,
  useLocation,
  Link
} from "react-router-dom";
import { login } from "../../services/authService";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordField from "../../components/auth/PasswordField";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(location.state?.message
    ? { text: location.state.message, type: "success" }
    : null);

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setFeedback(null);

    try {
      const data = await login({ email, password });

      navigate(data.user.role === "admin" ? "/admin/dashboard" : "/", { replace: true });

    } catch (error) {
      setFeedback({ text: error.message, type: "error" });

    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout eyebrow="Unified account access" title="Welcome back."
    description="Sign in to explore the latest technology.">
      <form className="auth-form" onSubmit={handleLogin}>
        <label className="auth-field" htmlFor="login-email">
          <span>Email address</span>
          <input id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          />
        </label>

        <PasswordField id="login-password" label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        {feedback && <p className={`auth-message auth-message-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="auth-switch">New here? <Link to="/signup">Create an account</Link></p>
    </AuthLayout>;
}
