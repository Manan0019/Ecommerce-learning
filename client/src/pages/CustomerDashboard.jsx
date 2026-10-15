import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch(
          "http://localhost:4000/api/auth/me",
          {
            credentials: "include",
            signal: controller.signal
          }
        );

        if (response.status === 401 ||
            response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load profile.");
        }

        const data = await response.json();
        setUser(data.user);

      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }

      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [navigate]);

  async function handleLogout() {
    try {
      const response = await fetch(
        "http://localhost:4000/api/auth/logout",
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      navigate("/login", { replace: true });

    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <p>Checking your session...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="auth-container">
      <h1>Customer Dashboard</h1>

      <h2>Welcome, {user.fullName}</h2>

      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}