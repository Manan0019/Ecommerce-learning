import {forwardRef} from 'react';
/** Canonical native dropdown. Change style tokens in design-system.css once. */
const Select = forwardRef(function Select({className='',children,...props},ref){
 return <select ref={ref} className={`nx-ui-select ${className}`.trim()} {...props}>{children}</select>;
});
export default Select;
