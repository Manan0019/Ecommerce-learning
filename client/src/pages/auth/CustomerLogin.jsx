import { Button, FormField, TextField } from "../../components/ui/index";
import { useState } from "react";
import {
  useNavigate,
  useLocation,
  Link
} from "react-router-dom";
import { login } from "../../services/authService";
import { getDeliverySession } from "../../services/deliveryService";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordField from "../../components/auth/PasswordField";

export default function CustomerLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [feedback, setFeedback] = useState(location.state?.message
    ? { text: location.state.message, type: "success" }
    : null);

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setFeedback(null);
    setInvalidCredentials(false);

    try {
      const data = await login({ email: email.trim(), password });

      window.dispatchEvent(new Event("nexora:changes-saved"));
      const returnTo = ["/checkout", "/orders", "/addresses", "/wishlist"].includes(location.state?.from) ? location.state.from : "/";
      if (data.user.role === "delivery") {
        // Do not show a successful sign-in unless the cookie and delivery role
        // are both accepted by the running backend.
        await getDeliverySession();
        navigate("/delivery/dashboard", { replace: true });
      } else {
        navigate(data.user.role === "admin" ? "/admin/dashboard" : returnTo, { replace: true });
      }

    } catch (error) {
      // Reveal recovery only for rejected credentials, never for network or server errors.
      setInvalidCredentials(error?.status === 401);
      setFeedback({ text: error.message, type: "error" });

    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout reflection eyebrow="Unified account access" title="Welcome back."
    description="Sign in to save favourites, manage addresses and follow your orders.">
      <form className="auth-form" onSubmit={handleLogin} aria-busy={loading}>
        <FormField className="auth-field" htmlFor="login-email">
          <span>Email address</span>
          <TextField id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => { setEmail(event.target.value); if (feedback?.type === "error") setFeedback(null); }}
          autoComplete="email"
          maxLength={254}
          autoFocus
          required
          />
        </FormField>

        <PasswordField id="login-password" label="Password"
          value={password}
          onChange={(event) => { setPassword(event.target.value); if (feedback?.type === "error") setFeedback(null); }}
          autoComplete="current-password"
          required
        />

        {feedback && <p className={`auth-message auth-message-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

        <Button variant="primary"  type="submit" disabled={loading}>
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {invalidCredentials && <p className="auth-switch"><Link to="/forgot-password" state={{ email: email.trim() }}>Forgot password?</Link></p>}
      <p className="auth-switch">New here? <Link to="/signup">Create an account</Link></p>
      <p className="nx32-security-line">Your password is never displayed publicly.</p>
    </AuthLayout>;
}
