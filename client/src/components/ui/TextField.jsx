import { forwardRef, useId } from 'react';
import FormField from './FormField';
import { fieldDescription } from './fieldProps';

const TextField = forwardRef(function TextField({ label, help, error, id, controlSize = 'md', className = '', type = 'text', ...props }, ref) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const control = <input ref={ref} id={controlId} type={type} className={`nx-ui-input nx-ui-size--${controlSize} ${className}`.trim()} {...props}
    aria-invalid={error ? true : props['aria-invalid']} aria-describedby={fieldDescription(controlId, help, error, props['aria-describedby'])}/>;
  return label != null || help || error ? <FormField htmlFor={controlId} label={label} required={props.required}>
    {control}{help && <small id={`${controlId}-help`} className="nx-ui-field-help">{help}</small>}
    {error && <small id={`${controlId}-error`} className="nx-ui-field-error" role="alert">{error}</small>}
  </FormField> : control;
});
export default TextField;
