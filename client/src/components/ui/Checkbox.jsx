import { forwardRef } from 'react';

/** Native checkboxes/radios retain form submission, validation and keyboard behavior. */
const Checkbox = forwardRef(function Checkbox({ type = 'checkbox', className = '', ...props }, ref) {
  return <input ref={ref} type={type} className={`nx-ui-choice ${className}`.trim()} {...props}/>;
});
export default Checkbox;
