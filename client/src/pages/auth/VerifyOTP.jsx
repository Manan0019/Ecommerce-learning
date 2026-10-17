import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { verifyRegistration } from "../../services/authService";
import AuthLayout from "../../components/auth/AuthLayout";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      await verifyRegistration({ email, otp });

      setOtp("");

      navigate("/login", {
        replace: true,
        state: {
          message: "Email verified! Please log in.",
        },
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <AuthLayout
        eyebrow="Verification"
        title="No pending signup found."
        description="Start registration again to request a new verification code."
        compact
      >
        <Link className="auth-submit auth-link-button" to="/signup">
          Create your account
        </Link>
        <p className="auth-switch">
          <Link to="/login">Return to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="Email verification"
      title="One quick verification."
      description="A world of technology awaits."
      compact
    >
      <p className="auth-verification-note">
        Enter the six-digit code sent to <strong>{email}</strong>.
      </p>

      <form className="auth-form" onSubmit={handleVerify}>
        <label className="auth-field" htmlFor="verification-code">
          <span>Verification code</span>
          <input
            id="verification-code"
            className="auth-otp-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 6);

              setOtp(digits);
            }}
            required
          />
        </label>

        {message && (
          <p className="auth-message auth-message-error" role="alert">
            {message}
          </p>
        )}

        <button
          className="auth-submit"
          type="submit"
          disabled={loading || otp.length !== 6}
        >
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <p className="auth-switch">
        Wrong email? <Link to="/signup">Start again</Link>
      </p>
    </AuthLayout>
  );
}
