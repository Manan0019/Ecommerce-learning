import { forwardRef } from 'react';
import TextField from './TextField';

/** Currency prefix belongs to the control, not to an overlapping input outline. */
const CurrencyInput = forwardRef(function CurrencyInput({ className = '', currencySymbol = '₹', ...props }, ref) {
  return <span className={`nx-ui-currency-control ${className}`.trim()}>
    <span className="nx-ui-currency-symbol" aria-hidden="true">{currencySymbol}</span>
    <TextField ref={ref} type="text" inputMode="numeric" {...props}/>
  </span>;
});
export default CurrencyInput;
