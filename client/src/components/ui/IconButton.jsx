import { forwardRef } from 'react';
import Button from './Button';
import UiIcon from '../common/UiIcon';

const IconButton = forwardRef(function IconButton({ icon, label, className = '', iconSize, children, type = 'button', ...props }, ref) {
  return <Button ref={ref} type={type} aria-label={label} title={label} className={`nx-ui-icon-button ${className}`.trim()} {...props}>
    {icon ? <UiIcon name={icon} size={iconSize}/> : children}
  </Button>;
});
export default IconButton;
