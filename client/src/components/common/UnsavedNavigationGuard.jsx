import { Button } from '../ui/index';
import { useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation } from 'react-router-dom';
import { isAuthenticationRoute, shouldBlockUnsavedNavigation } from './unsavedNavigationPolicy';

/** Track edited forms only on the route that owns the edits.
 * Authentication fields, filters and search controls are not unsaved documents.
 */
export default function UnsavedNavigationGuard() {
  const location = useLocation();
  const originals = useRef(new Map());
  // Route keys prevent a dirty flag from leaking from another page into login.
  const [dirtyKey, setDirtyKey] = useState(null);
  const dirty = dirtyKey === location.key && !isAuthenticationRoute(location.pathname);
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    shouldBlockUnsavedNavigation({ dirty, currentLocation, nextLocation }));

  useEffect(() => { originals.current.clear(); }, [location.key]);

  useEffect(() => {
    function candidate(el) {
      if (!(el instanceof HTMLElement)) return false;
      if (isAuthenticationRoute(location.pathname) || el.closest('.auth-shell,.auth-form,[data-unsaved-ignore="true"]')) return false;
      if (!el.matches('input,textarea,select,[contenteditable="true"]')) return false;
      if (el.matches('input[type="search"],input[type="hidden"],input[type="submit"],input[type="button"],input[type="reset"],input[type="file"]')) return false;
      if (el.closest('[class*="filter"],[class*="search"],[class*="toolbar"],[class*="pagination"]')) return false;
      if (/search|filter|find|sort|lookup|coupon test/i.test(`${el.getAttribute('placeholder') || ''} ${el.getAttribute('aria-label') || ''}`)) return false;
      if (el.closest('form,[data-unsaved-track="true"]')) return true;
      const admin = el.closest('.admin-shell,.nx57-delivery-shell');
      return Boolean(admin && el.matches('textarea,input[type="text"],input[type="number"],input[type="email"],input[type="tel"],input[type="url"]'));
    }
    function value(el) {
      return el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')
        ? String(el.checked) : el.value ?? el.textContent ?? '';
    }
    function focus(event) {
      const el = event.target;
      if (candidate(el) && !originals.current.has(el)) originals.current.set(el, value(el));
    }
    function changed(event) {
      const el = event.target;
      if (!candidate(el)) return;
      if (!originals.current.has(el)) originals.current.set(el, value(el));
      for (const field of originals.current.keys()) if (!field.isConnected) originals.current.delete(field);
      const hasChanges = [...originals.current].some(([field, initial]) => field.isConnected && value(field) !== initial);
      setDirtyKey(hasChanges ? location.key : null);
    }
    function cleared() { originals.current.clear(); setDirtyKey(null); }
    function beforeUnload(event) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    }
    document.addEventListener('focusin', focus, true);
    document.addEventListener('input', changed, true);
    document.addEventListener('change', changed, true);
    window.addEventListener('nexora:changes-saved', cleared);
    window.addEventListener('nexora:changes-discarded', cleared);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('focusin', focus, true);
      document.removeEventListener('input', changed, true);
      document.removeEventListener('change', changed, true);
      window.removeEventListener('nexora:changes-saved', cleared);
      window.removeEventListener('nexora:changes-discarded', cleared);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [dirty, location.key, location.pathname]);

  return blocker.state === 'blocked' && <div className="nx81-leave-overlay" role="presentation">
    <div className="nx81-leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="nx81-leave-title" aria-describedby="nx81-leave-description">
      <span className="nx52-eyebrow">UNSAVED CHANGES</span>
      <h2 id="nx81-leave-title">Leave without saving?</h2>
      <p id="nx81-leave-description">You have edited information on this page. Leaving now will discard changes that have not been saved. To save, return to the form and use its Save button.</p>
      <div className="nx81-leave-buttons">
        <Button variant="secondary" type="button" autoFocus onClick={() => blocker.reset()}>Keep editing</Button>
        <Button variant="danger" type="button" onClick={() => { originals.current.clear(); setDirtyKey(null); blocker.proceed(); }}>Discard and leave</Button>
      </div>
    </div>
  </div>;
}
