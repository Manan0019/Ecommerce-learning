import { Button, FormField, TextField } from "../../components/ui/index";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import UiIcon from '../../components/common/UiIcon';
import { login, logout } from '../../services/authService';
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
        await logout().catch(() => {});
        setError('This account does not have delivery workspace access.');
        return;
      }
      await getDeliverySession();
      navigate('/delivery/dashboard', { replace: true });
    } catch (e) {
      setError(e.status === 404
        ? 'Delivery sign-in is temporarily unavailable. Please try again later.'
        : e.status === 401 ? 'Check the email and password supplied by your administrator.'
        : e.message || 'Sign-in failed. Please try again.');
    } finally { setBusy(false); }
  }
  return <AuthLayout workforce eyebrow="NEXORA DELIVERY TEAM" title="Ready for your route?"
    description="Sign in with the delivery account created by your Nexora administrator.">
    <form className="auth-form nx52-delivery-login" onSubmit={submit} aria-busy={busy || checking}>
      <FormField className="auth-field" htmlFor="delivery-email"><span>Delivery email</span>
        <TextField id="delivery-email" type="email" value={email} required autoComplete="username" maxLength={254}
          placeholder="executive@example.com" onChange={e => setEmail(e.target.value)} /></FormField>
      <PasswordField id="delivery-password" label="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
      {error && <p role="alert" className="auth-message auth-message-error">{error}</p>}
      <Button variant="primary"  disabled={busy || checking} type="submit">{checking ? 'Checking session…' : busy ? 'Verifying account…' : 'Enter delivery workspace'} <UiIcon name="right" size={17}/></Button>
    </form>
  </AuthLayout>;
}
