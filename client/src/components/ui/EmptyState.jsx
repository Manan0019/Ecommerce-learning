import UiIcon from '../common/UiIcon';
/** A reusable friendly visual for truly empty and filtered views. */
export default function EmptyState({title='Nothing here yet',description='',icon='package',className='',action}){
 return <div className={`nx-ui-empty ${className}`.trim()} role="status">
   <span className="nx-ui-empty-icon"><UiIcon name={icon} size={28}/></span>
   <strong>{title}</strong>{description&&<p>{description}</p>}{action}
 </div>;
}
