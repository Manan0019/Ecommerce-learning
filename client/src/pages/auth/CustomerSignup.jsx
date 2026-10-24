import { Button, FormField, TextField } from "../../components/ui/index";
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
      if (form.password.length < 12) throw new Error("Password must be at least 12 characters.");
      if (form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));

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

  return <AuthLayout reflection eyebrow="Create your account" title="A little of everything starts here."
    description="Save favourites, manage delivery addresses and track your orders in one place.">
      <form className="auth-form auth-signup-form nx37-signup-form" onSubmit={handleSubmit}>
        <div className="nx37-signup-note"><span aria-hidden="true">✦</span> One account for favourites, addresses and orders.</div>
        <FormField className="auth-field" htmlFor="signup-name"><span>Full name <b className="nx37-required" aria-hidden="true">*</b></span>
          <TextField id="signup-name"
          type="text"
          name="fullName"
          placeholder="Your full name"
          value={form.fullName}
          onChange={handleChange}
          autoComplete="name"
          required
          />
        </FormField>

        <FormField className="auth-field" htmlFor="signup-email"><span>Email address <b className="nx37-required" aria-hidden="true">*</b></span>
          <TextField id="signup-email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          maxLength={254}
          required
          />
        </FormField>

        <FormField className="auth-field" htmlFor="signup-mobile"><span>Mobile number <b className="nx37-required" aria-hidden="true">*</b></span>
          <TextField id="signup-mobile"
          type="tel"
          name="mobileNumber"
          placeholder="Your mobile number"
          value={form.mobileNumber}
          onChange={handleChange}
          autoComplete="tel"
          inputMode="tel"
          maxLength={16}
          required
          />
        </FormField>

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

        {message && <p className="auth-message auth-message-error" role="alert">{message}</p>}

        <Button variant="primary"  type="submit" disabled={loading}>
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? "Sending verification code…" : "Create account"}
        </Button>
      </form>

      <p className="auth-switch nx37-signup-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>;
}
