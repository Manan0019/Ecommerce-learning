import { forwardRef, useId } from 'react';
import FormField from './FormField';
import { fieldDescription } from './fieldProps';

/** `size` remains the native list-box row count; `controlSize` is the visual size. */
const Select = forwardRef(function Select({ label, help, error, id, controlSize = 'md', width, className = '', children, style, ...props }, ref) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const control = <select ref={ref} id={controlId} className={`nx-ui-select nx-ui-size--${controlSize} ${className}`.trim()}
    style={width ? { ...style, width } : style} {...props} aria-invalid={error ? true : props['aria-invalid']}
    aria-describedby={fieldDescription(controlId, help, error, props['aria-describedby'])}>{children}</select>;
  return label != null || help || error ? <FormField htmlFor={controlId} label={label} required={props.required}>
    {control}{help && <small id={`${controlId}-help`} className="nx-ui-field-help">{help}</small>}
    {error && <small id={`${controlId}-error`} className="nx-ui-field-error" role="alert">{error}</small>}
  </FormField> : control;
});
export default Select;
