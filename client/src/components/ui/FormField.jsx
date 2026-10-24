import { useId } from 'react';

/** Children mode preserves native label associations and complex editors. */
export default function FormField({ as: Component = 'label', label, required, help, error, htmlFor, id, inline = false, className = '', children, ...props }) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  return <Component id={id} htmlFor={htmlFor} className={`nx-ui-field${inline ? ' nx-ui-field--inline' : ''} ${className}`.trim()} {...props}>
    {label != null && <span className="nx-ui-field-label">{label}{required && <span className="nx-ui-required" aria-hidden="true"> *</span>}</span>}
    {children}
    {help && <small id={`${fieldId}-help`} className="nx-ui-field-help">{help}</small>}
    {error && <small id={`${fieldId}-error`} className="nx-ui-field-error" role="alert">{error}</small>}
  </Component>;
}
