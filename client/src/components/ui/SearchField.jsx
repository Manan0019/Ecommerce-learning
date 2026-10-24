import { forwardRef, useRef, useState } from 'react';
import UiIcon from '../common/UiIcon';
import IconButton from './IconButton';

/** Owns the icon, native input, clear action and spacing. Ref points at the input. */
const SearchField = forwardRef(function SearchField({ label, value, defaultValue = '', onChange, onClear, placeholder = 'Search', clearable = true,
  size = 'md', className = '', disabled, ...props }, ref) {
  const inputRef = useRef(null);
  const [localValue, setLocalValue] = useState(defaultValue);
  const currentValue = value === undefined ? localValue : value;
  function clear() {
    const input = inputRef.current;
    // Preserve real target/currentTarget semantics in existing React change handlers.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setLocalValue('');
    onClear?.();
    input.focus();
  }
  return <span className={`nx-ui-search-field nx-ui-size--${size} ${className}`.trim()} data-disabled={disabled || undefined}>
    <UiIcon name="search"/>
    <input {...props} ref={node => { inputRef.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
      type="search" className="nx-ui-search-input" disabled={disabled} value={currentValue} placeholder={placeholder}
      aria-label={props['aria-label'] || label || placeholder} onChange={event => { setLocalValue(event.target.value); onChange?.(event); }}/>
    {clearable && String(currentValue || '').length > 0 && <IconButton icon="x" label={`Clear ${label || props['aria-label'] || 'search'}`}
      className="nx-ui-search-clear" variant="ghost" disabled={disabled} onClick={clear}/>}
  </span>;
});
export default SearchField;
