import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [nameMessage, setNameMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
        if (data.user.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        setUser(data.user);
        setFullName(data.user.fullName);

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

  async function updateName(event) {
    event.preventDefault();
    setSavingName(true);
    setNameMessage("");
    try {
      const response = await fetch("http://localhost:4000/api/auth/profile/name", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName })
      });
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) throw new Error(data.message || "Could not update name.");
      setUser(data.user);
      setFullName(data.user.fullName);
      setNameMessage(data.message);
    } catch (err) {
      setNameMessage(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage("");
    try {
      if (passwords.newPassword !== passwords.confirmPassword) {
        throw new Error("New passwords do not match.");
      }
      const response = await fetch("http://localhost:4000/api/auth/profile/password", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords)
      });
      const data = await response.json();
      if (response.status === 401 && data.message === "Please log in.") {
        navigate("/login", { replace: true });
        return;
      }
      if (response.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) throw new Error(data.message || "Could not update password.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage(data.message);
    } catch (err) {
      setPasswordMessage(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

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
      <h1>Customer Profile</h1>

      {user.profileImageUrl ? (
        <img
          className="profile-image"
          src={`http://localhost:4000${user.profileImageUrl}`}
          alt={`${user.fullName}'s profile`}
        />
      ) : <div className="profile-image profile-placeholder" aria-label="No profile image">No image</div>}

      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Mobile number:</strong> {user.mobileNumber || "Not provided"}</p>

      <form onSubmit={updateName}>
        <h2>Change name</h2>
        <input
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          minLength={2}
          maxLength={100}
          required
        />
        <button type="submit" disabled={savingName}>
          {savingName ? "Saving..." : "Save name"}
        </button>
        {nameMessage && <p role="status">{nameMessage}</p>}
      </form>

      <form onSubmit={updatePassword}>
        <h2>Change password</h2>
        <input
          type="password"
          placeholder="Current password"
          value={passwords.currentPassword}
          onChange={(event) => setPasswords((value) => ({ ...value, currentPassword: event.target.value }))}
          autoComplete="current-password"
          required
        />
        <input
          type="password"
          placeholder="New password (minimum 12 characters)"
          value={passwords.newPassword}
          onChange={(event) => setPasswords((value) => ({ ...value, newPassword: event.target.value }))}
          minLength={12}
          autoComplete="new-password"
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={passwords.confirmPassword}
          onChange={(event) => setPasswords((value) => ({ ...value, confirmPassword: event.target.value }))}
          minLength={12}
          autoComplete="new-password"
          required
        />
        <button type="submit" disabled={savingPassword}>
          {savingPassword ? "Saving..." : "Change password"}
        </button>
        {passwordMessage && <p role="status">{passwordMessage}</p>}
      </form>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}
