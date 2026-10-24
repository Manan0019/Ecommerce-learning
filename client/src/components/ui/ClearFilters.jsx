import Button from './Button';
import UiIcon from '../common/UiIcon';
/** Deliberately invisible until a search, sort, or filter differs from its default. */
export default function ClearFilters({active,onClear,label='Clear filters',className='',disabled=false}){
 if(!active)return null;
 return <Button type="button" variant="outline" aria-label={label} title={label} disabled={disabled} className={`nx-ui-clear-filters ${className}`.trim()} onClick={onClear}><UiIcon name="refresh-cw" size={16}/><span>Reset filters</span></Button>;
}
