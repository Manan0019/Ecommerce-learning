import { forwardRef, useId } from 'react';
import FormField from './FormField';
import { fieldDescription } from './fieldProps';

const Textarea = forwardRef(function Textarea({ label, help, error, id, className = '', ...props }, ref) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const control = <textarea ref={ref} id={controlId} className={`nx-ui-textarea ${className}`.trim()} {...props}
    aria-invalid={error ? true : props['aria-invalid']} aria-describedby={fieldDescription(controlId, help, error, props['aria-describedby'])}/>;
  return label != null || help || error ? <FormField htmlFor={controlId} label={label} required={props.required}>
    {control}{help && <small id={`${controlId}-help`} className="nx-ui-field-help">{help}</small>}
    {error && <small id={`${controlId}-error`} className="nx-ui-field-error" role="alert">{error}</small>}
  </FormField> : control;
});
export default Textarea;
