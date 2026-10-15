import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: ""
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
      const response = await fetch(
        "http://localhost:4000/api/auth/signup",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(form)
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
      <h1>Create Customer Account</h1>

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
          type="password"
          name="password"
          placeholder="Password (minimum 12 characters)"
          value={form.password}
          onChange={handleChange}
          minLength={12}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending OTP..." : "Sign Up"}
        </button>
      </form>

      {message && <p role="alert">{message}</p>}
    </div>
  );
}