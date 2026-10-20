import { useState } from "react";

export default function PasswordField({ id, label, required, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return <label className="auth-field" htmlFor={id}>
    <span>{label}{required && <b className="nx37-required" aria-hidden="true"> *</b>}</span>
    <span className="auth-password-control">
      <input id={id} type={visible ? "text" : "password"} required={required} {...inputProps} />
      <button type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  </label>;
}
