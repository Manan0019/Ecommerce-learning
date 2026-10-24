import UiIcon from '../common/UiIcon';
/** Equal-sized icon actions with accessible names and one motion rule. */
export default function IconButton({icon='x',label,className='',size=18,...props}){
 return <button type="button" aria-label={label} title={label} className={`nx-ui-icon-button ${className}`.trim()} {...props}><UiIcon name={icon} size={size}/></button>;
}
