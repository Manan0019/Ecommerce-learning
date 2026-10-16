import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerCustomer } from "../../services/authService";
import AuthLayout from "../../components/auth/AuthLayout";
import PasswordField from "../../components/auth/PasswordField";

export default function CustomerSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: ""
  });
  const [profileImage, setProfileImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (profileImage) body.append("profileImage", profileImage);

      await registerCustomer(body);

      navigate("/verify-otp", {
        state: {
          email: form.email.trim().toLowerCase()
        }
      });

    } catch (error) {
      setMessage(error.message);

    } finally {
      setLoading(false);
    }
  }

  return <AuthLayout eyebrow="Create your account" title="Join the future of tech."
    description="Create your account.">
      <form className="auth-form auth-signup-form" onSubmit={handleSubmit}>
        <label className="auth-field" htmlFor="signup-name"><span>Full name</span>
          <input id="signup-name"
          type="text"
          name="fullName"
          placeholder="Your full name"
          value={form.fullName}
          onChange={handleChange}
          autoComplete="name"
          required
          />
        </label>

        <label className="auth-field" htmlFor="signup-email"><span>Email address</span>
          <input id="signup-email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
          />
        </label>

        <label className="auth-field" htmlFor="signup-mobile"><span>Mobile number</span>
          <input id="signup-mobile"
          type="tel"
          name="mobileNumber"
          placeholder="Your mobile number"
          value={form.mobileNumber}
          onChange={handleChange}
          autoComplete="tel"
          required
          />
        </label>

        <PasswordField id="signup-password" label="Password"
          name="password"
          placeholder="Password (minimum 12 characters)"
          value={form.password}
          onChange={handleChange}
          minLength={12}
          autoComplete="new-password"
          required
        />

        <PasswordField id="signup-confirm-password" label="Confirm password"
          name="confirmPassword"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={handleChange}
          minLength={12}
          autoComplete="new-password"
          required
        />

        <label className="auth-field auth-file-field" htmlFor="signup-image">
          <span>Profile image <small>Optional · JPG, PNG or WebP</small></span>
          <input
            id="signup-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)}
          />
        </label>

        {message && <p className="auth-message auth-message-error" role="alert">{message}</p>}

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? "Sending verification code…" : "Create account"}
        </button>
      </form>

      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>;
}
