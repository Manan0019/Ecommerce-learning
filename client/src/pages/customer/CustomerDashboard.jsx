import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { isAuthenticationError } from "../../services/apiClient";
import { getCurrentUser, logout, updateCustomerName, updateCustomerPassword } from "../../services/authService";

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
        const data = await getCurrentUser(controller.signal);
        if (data.user.role === "admin") {
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        setUser(data.user);
        setFullName(data.user.fullName);

      } catch (err) {
        if (isAuthenticationError(err)) {
          navigate("/login", { replace: true });
          return;
        }
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
      const data = await updateCustomerName(fullName);
      setUser(data.user);
      setFullName(data.user.fullName);
      setNameMessage(data.message);
    } catch (err) {
      if (isAuthenticationError(err)) {
        navigate("/login", { replace: true });
        return;
      }
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
      const data = await updateCustomerPassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage(data.message);
    } catch (err) {
      if (isAuthenticationError(err) && err.data?.message === "Please log in.") {
        navigate("/login", { replace: true });
        return;
      }
      if (err.status === 403) {
        navigate("/login", { replace: true });
        return;
      }
      setPasswordMessage(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();

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

  return <CustomerLayout mainClassName="nx-profile-page nx37-account-page">
    <div className="nx37-account-shell">
      <div className="nx37-account-heading"><div><span className="eyebrow">YOUR SPACE</span><h1>Good to see you, {user.fullName?.split(" ")[0] || "there"}.</h1><p>Everything about your account in one place.</p></div><span className="nx37-account-illustration" aria-hidden="true">✦</span></div>
      <div className="nx37-account-identity"><div className="nx35-account-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.4"/><path d="M4.8 20c.35-4.25 3.1-6.35 7.2-6.35s6.85 2.1 7.2 6.35"/></svg></div><div><strong>{user.fullName}</strong><span>{user.email}</span><small>{user.mobileNumber || "Mobile number not available"}</small></div></div>
      <nav className="nx37-account-shortcuts" aria-label="Account shortcuts">
        <Link to="/orders"><span aria-hidden="true">▣</span><strong>My orders</strong><small>View order status and totals</small><em aria-hidden="true">↗</em></Link>
        <Link to="/addresses"><span aria-hidden="true">⌂</span><strong>Saved addresses</strong><small>Manage where orders arrive</small><em aria-hidden="true">↗</em></Link>
        <Link to="/wishlist"><span aria-hidden="true">♡</span><strong>Favourites</strong><small>Return to things you loved</small><em aria-hidden="true">↗</em></Link>
      </nav>
      <div className="nx37-account-settings"><section className="nx37-account-panel"><div className="nx37-account-section-head"><span className="eyebrow">PERSONAL DETAILS</span><h2>Change your name</h2><p>Your email and account role cannot be changed here.</p></div>
        <form onSubmit={updateName}><label htmlFor="nx37-account-name">Full name <span className="nx37-required">*</span></label><input id="nx37-account-name" type="text" autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} minLength={2} maxLength={100} required/><button type="submit" disabled={savingName}>{savingName ? "Saving…" : "Save changes"}</button>{nameMessage && <p role="status" className="nx37-account-feedback">{nameMessage}</p>}</form>
      </section><section className="nx37-account-panel"><div className="nx37-account-section-head"><span className="eyebrow">ACCOUNT SECURITY</span><h2>Update your password</h2><p>Choose a new password with at least 12 characters.</p></div>
        <form onSubmit={updatePassword}><label htmlFor="nx37-current-password">Current password <span className="nx37-required">*</span></label><input id="nx37-current-password" type="password" value={passwords.currentPassword} onChange={event => setPasswords(v => ({ ...v, currentPassword: event.target.value }))} autoComplete="current-password" required />
          <label htmlFor="nx37-new-password">New password <span className="nx37-required">*</span></label><input id="nx37-new-password" type="password" value={passwords.newPassword} onChange={event => setPasswords(v => ({ ...v, newPassword: event.target.value }))} minLength={12} autoComplete="new-password" required />
          <label htmlFor="nx37-confirm-password">Confirm password <span className="nx37-required">*</span></label><input id="nx37-confirm-password" type="password" value={passwords.confirmPassword} onChange={event => setPasswords(v => ({ ...v, confirmPassword: event.target.value }))} minLength={12} autoComplete="new-password" required />
          <button type="submit" disabled={savingPassword}>{savingPassword ? "Updating…" : "Update password"}</button>{passwordMessage && <p role="status" className="nx37-account-feedback">{passwordMessage}</p>}</form>
      </section></div>
      <div className="nx37-account-bottom"><span>Need to switch accounts?</span><button type="button" onClick={handleLogout}>Sign out ↗</button></div>
    </div>
  </CustomerLayout>;
}
