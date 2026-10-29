import { FormField, TextField } from '../ui/index';
import UiIcon from '../common/UiIcon';
import { useState } from 'react';

/** Shared accessible password input: the toggle is a single eye icon, never text. */
export default function PasswordField({ id, label = 'Password', required, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return <FormField className="auth-field" htmlFor={id}>
    <span>{label}{required && <b className="nx37-required" aria-hidden="true"> *</b>}</span>
    <span className="auth-password-control nx-ui-password-field">
      <TextField id={id} type={visible ? 'text' : 'password'} required={required} {...inputProps} />
      <button className="auth-password-toggle" data-visible={visible ? "true" : "false"} type="button" aria-controls={id}
        aria-label={`${visible ? 'Hide' : 'Show'} password`} aria-pressed={visible}
        onMouseDown={event => event.preventDefault()}
        onClick={() => setVisible(current => !current)}>
        <span className="auth-password-glyph" aria-hidden="true">
          <UiIcon name={visible ? 'eye-off' : 'eye'} size={20} />
        </span>
      </button>
    </span>
  </FormField>;
}
