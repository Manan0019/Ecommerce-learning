import { useState } from "react";
import {
  useLocation,
  useNavigate,
  Link
} from "react-router-dom";

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
      const response = await fetch(
        "http://localhost:4000/api/auth/verify-otp",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email,
            otp
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Verification failed"
        );
      }

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
      <div className="auth-container">
        <h2>No pending signup found</h2>
        <Link to="/signup">Go to Signup</Link>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h1>Verify Email</h1>

      <p>
        Enter the 6-digit code sent to {email}
      </p>

      <form onSubmit={handleVerify}>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter OTP"
          value={otp}
          onChange={(event) => {
            const digits = event.target.value
              .replace(/\D/g, "")
              .slice(0, 6);

            setOtp(digits);
          }}
          required
        />

        <button
          type="submit"
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}
    </div>
  );
}