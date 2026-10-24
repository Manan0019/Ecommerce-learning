import { Button, FormField, TextField } from "../ui/index";
import { useState } from "react";

export default function PasswordField({ id, label, required, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return <FormField className="auth-field" htmlFor={id}>
    <span>{label}{required && <b className="nx37-required" aria-hidden="true"> *</b>}</span>
    <span className="auth-password-control">
      <TextField id={id} type={visible ? "text" : "password"} required={required} {...inputProps} />
      <Button variant="secondary" type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
        aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? "Hide" : "Show"}
      </Button>
    </span>
  </FormField>;
}
