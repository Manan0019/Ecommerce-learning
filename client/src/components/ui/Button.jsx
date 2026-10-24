import { forwardRef } from 'react';

/** Native button semantics, also usable with Link through `as={Link}`. */
const Button = forwardRef(function Button({ as: Component = 'button', variant = 'secondary', size = 'md', className = '', children, ...props }, ref) {
  return <Component ref={ref} className={`nx-ui-button nx-ui-button--${variant} nx-ui-size--${size} ${className}`.trim()} {...props}>{children}</Component>;
});
export default Button;
