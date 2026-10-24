import {forwardRef} from 'react';
import UiIcon from '../common/UiIcon';
/** Search input and optional complete field use the same native input design. */
export const SearchInput=forwardRef(function SearchInput({className='',placeholder='Search',...props},ref){
 return <input ref={ref} type="search" className={`nx-ui-search-input ${className}`.trim()}
  placeholder={placeholder} aria-label={props['aria-label']||placeholder} {...props}/>;
});
export default function SearchField({label='Search',value,onChange,placeholder=label,className='',...props}){
 return <label className={`nx-ui-search-field ${className}`.trim()}><UiIcon name="search" size={18}/>
  <SearchInput value={value} onChange={onChange} placeholder={placeholder} aria-label={label} {...props}/></label>;
}
