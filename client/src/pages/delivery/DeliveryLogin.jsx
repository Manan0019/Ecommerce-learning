import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import UiIcon from '../../components/common/UiIcon';
import { login } from '../../services/authService';
import { getDeliverySession } from '../../services/deliveryService';

export default function DeliveryLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    getDeliverySession().then(() => { if (mounted) navigate('/delivery/dashboard', { replace: true }); })
      .catch(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, [navigate]);
  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const response = await login({ email: email.trim(), password });
      if (response.user?.role !== 'delivery') {
        setError('This is the delivery team sign-in. For your other account, use the regular sign-in page.');
        return;
      }
      await getDeliverySession();
      navigate('/delivery/dashboard', { replace: true });
    } catch (e) {
      setError(e.status === 404
        ? 'The running backend does not include the delivery service. Update and restart Express.'
        : e.status === 401 ? 'Check the email and password supplied by your administrator.'
        : e.message || 'Sign-in failed. Please try again.');
    } finally { setBusy(false); }
  }
  return <AuthLayout eyebrow="NEXORA DELIVERY TEAM" title="Ready for your route?"
    description="Sign in with the delivery account created by your Nexora administrator.">
    <form className="auth-form nx52-delivery-login" onSubmit={submit} aria-busy={busy || checking}>
      <label className="auth-field" htmlFor="delivery-email"><span>Delivery email</span>
        <input id="delivery-email" type="email" value={email} required autoComplete="username" maxLength={254}
          placeholder="executive@example.com" onChange={e => setEmail(e.target.value)} /></label>
      <PasswordField id="delivery-password" label="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
      {error && <p role="alert" className="auth-message auth-message-error">{error}</p>}
      <button className="auth-submit" disabled={busy || checking} type="submit">{checking ? 'Checking session…' : busy ? 'Verifying account…' : 'Enter delivery workspace'} <UiIcon name="right" size={17}/></button>
    </form>
    <p className="auth-switch">Shopping at Nexora? <Link to="/login">Customer and admin sign in</Link></p>
  </AuthLayout>;
}
