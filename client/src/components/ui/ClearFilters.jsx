import IconButton from './IconButton';
/** Deliberately invisible until a search, sort, or filter differs from its default. */
export default function ClearFilters({active,onClear,label='Clear filters',className=''}){
 if(!active)return null;
 return <IconButton icon="x" label={label} className={`nx-ui-clear-filters ${className}`.trim()} onClick={onClear}/>;
}
