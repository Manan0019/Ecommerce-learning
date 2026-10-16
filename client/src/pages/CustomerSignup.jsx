import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

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

      const response = await fetch(
        `${API_BASE_URL}/api/auth/signup`,
        {
          method: "POST",

          body
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

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

  return (
    <div className="auth-container">
      <h1>Create your account</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="fullName"
          placeholder="Full name"
          value={form.fullName}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          required
        />

        <input
          type="tel"
          name="mobileNumber"
          placeholder="Mobile number"
          value={form.mobileNumber}
          onChange={handleChange}
          autoComplete="tel"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password (minimum 12 characters)"
          value={form.password}
          onChange={handleChange}
          minLength={12}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={handleChange}
          minLength={12}
          autoComplete="new-password"
          required
        />

        <label>
          Profile image (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setProfileImage(event.target.files?.[0] ?? null)}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Sending OTP..." : "Sign Up"}
        </button>
      </form>

      {message && <p role="alert">{message}</p>}
    </div>
  );
}
