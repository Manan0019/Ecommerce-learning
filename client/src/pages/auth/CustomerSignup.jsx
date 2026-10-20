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

  return <AuthLayout eyebrow="Create your account" title="A little of everything starts here."
    description="Save favourites, manage delivery addresses and track your orders in one place.">
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
          maxLength={254}
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
          inputMode="tel"
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

        <p className={`nx32-password-guidance${form.password.length >= 12 ? " is-valid" : ""}`}>
          {form.password.length >= 12 ? "✓ Minimum password length met" : "Use at least 12 characters for your password"}
        </p>

        <PasswordField id="signup-confirm-password" label="Confirm password"
          name="confirmPassword"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={handleChange}
          minLength={12}
          autoComplete="new-password"
          required
        />

        {form.confirmPassword && <p className={`nx32-password-guidance${form.password === form.confirmPassword ? " is-valid" : " is-invalid"}`}>
          {form.password === form.confirmPassword ? "✓ Passwords match" : "Passwords do not match yet"}
        </p>}

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
